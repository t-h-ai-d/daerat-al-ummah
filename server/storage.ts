import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import express, { type Express } from "express";
import { Readable } from "node:stream";
import { getR2MediaBinding } from "./_core/runtime";
import { getPostAttachmentScanStatus } from "./db";
import { attachmentScanStatus, isAttachmentDownloadAllowed, requiresAttachmentQuarantine } from "./attachmentSecurity";
import { getLocalSessionUser } from "./localAuth";

const SIGNED_URL_TTL_SECONDS = 60 * 10;
export const APP_RELAY_MAX_BYTES = 25_000_000;

export type ObjectStorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

export function resolveObjectStorageConfig(env: NodeJS.ProcessEnv = process.env): ObjectStorageConfig {
  const suppliedEndpoint = env.S3_ENDPOINT?.trim();
  const bucket = env.S3_BUCKET?.trim();
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim();
  const missing = [
    !suppliedEndpoint && "S3_ENDPOINT",
    !bucket && "S3_BUCKET",
    !accessKeyId && "S3_ACCESS_KEY_ID",
    !secretAccessKey && "S3_SECRET_ACCESS_KEY",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(`Object storage is not configured. Missing: ${missing.join(", ")}`);
  }

  const endpoint = /^(https?:)?\/\//i.test(suppliedEndpoint!) ? suppliedEndpoint! : `https://${suppliedEndpoint!}`;
  let normalizedEndpoint: string;
  try {
    const parsedEndpoint = new URL(endpoint);
    if (parsedEndpoint.protocol !== "https:" && parsedEndpoint.protocol !== "http:") throw new Error("unsupported protocol");
    normalizedEndpoint = parsedEndpoint.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("Object storage endpoint is not a valid HTTP URL.");
  }

  return {
    endpoint: normalizedEndpoint,
    region: env.S3_REGION?.trim() || "auto",
    bucket: bucket!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
  };
}

function createObjectStorageClient(config: ObjectStorageConfig) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export function safeAttachmentFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

export function relayAttachmentKind(mimeType: string): "image" | "gif" | "video" | "file" {
  if (mimeType === "image/gif") return "gif";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

function readRelayFilename(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return decodeURIComponent(value).trim().slice(0, 255) || null;
  } catch {
    return null;
  }
}

export function buildRelayAttachmentMetadata(filename: string, mimeType: string, sizeBytes: number) {
  const scanStatus = attachmentScanStatus(filename, mimeType);
  return {
    filename,
    mimeType,
    sizeBytes,
    kind: relayAttachmentKind(mimeType),
    scanStatus,
    storagePrefix: requiresAttachmentQuarantine(filename, mimeType) ? "quarantine" : "posts",
  };
}

function uploadRouteForKey(key: string): string {
  return `/uploads/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const media = getR2MediaBinding();
  if (media) {
    await media.put(key, data, { httpMetadata: { contentType } });
    return { key, url: uploadRouteForKey(key) };
  }
  const config = resolveObjectStorageConfig();
  const client = createObjectStorageClient(config);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }),
  );

  return { key, url: uploadRouteForKey(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: uploadRouteForKey(key) };
}

export async function storageDelete(relKey: string): Promise<void> {
  const key = normalizeKey(relKey);
  const media = getR2MediaBinding();
  if (media) {
    await media.delete(key);
    return;
  }

  const config = resolveObjectStorageConfig();
  const client = createObjectStorageClient(config);
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const config = resolveObjectStorageConfig();
  const client = createObjectStorageClient(config);
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: config.bucket, Key: normalizeKey(relKey) }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );
}

export async function storageGetPrivateReadStream(relKey: string): Promise<{ body: Readable; contentLength?: number }> {
  const key = normalizeKey(relKey);
  const media = getR2MediaBinding();
  if (media) {
    const object = await media.get(key);
    if (!object) throw new Error("The quarantined object was not found.");
    return { body: Readable.from(Buffer.from(await object.arrayBuffer())) };
  }

  const config = resolveObjectStorageConfig();
  const client = createObjectStorageClient(config);
  const object = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  if (!object.Body) throw new Error("The quarantined object was not found.");
  if (object.Body instanceof Readable) return { body: object.Body, contentLength: object.ContentLength };
  if (typeof (object.Body as ReadableStream).getReader === "function") {
    return { body: Readable.fromWeb(object.Body as never), contentLength: object.ContentLength };
  }
  throw new Error("The object storage response is not streamable.");
}

export async function storageCreatePresignedUpload(
  relKey: string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string; uploadUrl: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const config = resolveObjectStorageConfig();
  const client = createObjectStorageClient(config);
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: SIGNED_URL_TTL_SECONDS },
  );

  return { key, url: uploadRouteForKey(key), uploadUrl };
}

export function registerObjectStorageRoutes(app: Express) {
  app.put("/api/uploads/relay", express.raw({ type: "application/octet-stream", limit: `${APP_RELAY_MAX_BYTES}b` }), async (req, res) => {
    const user = await getLocalSessionUser(req);
    if (!user) {
      res.status(401).json({ message: "سَجِّلِ الدُّخولَ قبل رفع المرفقات." });
      return;
    }
    const filename = readRelayFilename(req.header("X-Attachment-Name"));
    const mimeType = (req.header("X-Attachment-Type") || "application/octet-stream").trim().slice(0, 128) || "application/octet-stream";
    if (!filename || !Buffer.isBuffer(req.body) || !req.body.length) {
      res.status(400).json({ message: "لم نتمكّن من قراءة الملف. اختره مجدّدًا ثم أعد المحاولة." });
      return;
    }
    try {
      const metadata = buildRelayAttachmentMetadata(filename, mimeType, req.body.length);
      const stored = await storagePut(`${user.id}/${metadata.storagePrefix}/${safeAttachmentFilename(filename)}`, req.body, mimeType);
      res.status(201).json({ ...stored, kind: metadata.kind, filename: metadata.filename, mimeType: metadata.mimeType, sizeBytes: metadata.sizeBytes, scanStatus: metadata.scanStatus });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      console.error("[AttachmentRelay] upload failed", { message });
      res.status(503).json({ message: "تعذّر حفظ الملف الآن. لم يُنشَر أيّ محتوى؛ أعد المحاولة بعد لحظة." });
    }
  });

  app.get("/uploads/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing upload key");
      return;
    }

    try {
      if (key.includes("/posts/") || key.includes("/quarantine/")) {
        const scanStatus = await getPostAttachmentScanStatus(key);
        if (!isAttachmentDownloadAllowed(scanStatus)) {
          res.status(scanStatus ? 423 : 404).send(scanStatus === "blocked" ? "Attachment blocked by security scan" : "Attachment is quarantined pending a security scan");
          return;
        }
      }
      const media = getR2MediaBinding();
      if (media) {
        const object = await media.get(key);
        if (!object) {
          res.status(404).send("File not found");
          return;
        }
        if (object.httpMetadata?.contentType) res.type(object.httpMetadata.contentType);
        res.set("Cache-Control", "private, max-age=300");
        res.send(Buffer.from(await object.arrayBuffer()));
        return;
      }
      const signedUrl = await storageGetSignedUrl(key);
      res.set("Cache-Control", "private, max-age=300");
      res.redirect(307, signedUrl);
    } catch (error) {
      console.error("[ObjectStorage] download redirect failed", error);
      res.status(503).send("File storage is not configured");
    }
  });
}
