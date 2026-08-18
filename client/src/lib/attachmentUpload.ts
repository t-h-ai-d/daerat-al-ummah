export type UploadedAttachment = {
  kind: "image" | "gif" | "video" | "file";
  url: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  scanStatus: "pending" | "clean" | "blocked";
};

export type PreparedAttachmentUpload = Omit<UploadedAttachment, "storageKey"> & {
  key: string;
  uploadUrl: string;
  sharedLimitBytes?: number;
};

/** Small files use the app relay so member browsers never depend on bucket CORS. */
export const APP_RELAY_MAX_BYTES = 25_000_000;

const safeUploadMessage = "لم يكتمل رفع الملف الآن. لم يُنشَر أيّ محتوى؛ أعد المحاولة بعد لحظة.";

function asUploadedAttachment(value: unknown): UploadedAttachment {
  const attachment = value as Partial<UploadedAttachment>;
  if (!attachment || !attachment.storageKey || !attachment.url || !attachment.filename || !attachment.mimeType || !attachment.kind || !attachment.scanStatus || typeof attachment.sizeBytes !== "number") {
    throw new Error(safeUploadMessage);
  }
  return attachment as UploadedAttachment;
}

async function uploadThroughApp(file: File, mimeType: string): Promise<UploadedAttachment> {
  let response: Response;
  try {
    response = await fetch("/api/uploads/relay", {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Attachment-Name": encodeURIComponent(file.name),
        "X-Attachment-Type": mimeType,
      },
      body: file,
    });
  } catch {
    throw new Error(safeUploadMessage);
  }

  const body = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(safeUploadMessage);
  }
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "message" in payload ? (payload as { message?: unknown }).message : undefined;
    throw new Error(typeof message === "string" && message.trim() ? message : safeUploadMessage);
  }
  return asUploadedAttachment(payload);
}

async function uploadDirectly(
  file: File,
  mimeType: string,
  prepareDirectUpload: (input: { filename: string; mimeType: string; sizeBytes: number }) => Promise<PreparedAttachmentUpload>,
): Promise<UploadedAttachment> {
  const prepared = await prepareDirectUpload({ filename: file.name, mimeType, sizeBytes: file.size });
  const uploadUrl = new URL(prepared.uploadUrl);
  if (!/^https?:$/.test(uploadUrl.protocol)) throw new Error("invalid upload protocol");
  const response = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": prepared.mimeType }, body: file });
  if (!response.ok) throw new Error("direct upload rejected");
  return {
    kind: prepared.kind,
    url: prepared.url,
    storageKey: prepared.key,
    filename: prepared.filename,
    mimeType: prepared.mimeType,
    sizeBytes: prepared.sizeBytes,
    scanStatus: prepared.scanStatus,
  };
}

export async function uploadAttachmentSafely(
  file: File,
  prepareDirectUpload: (input: { filename: string; mimeType: string; sizeBytes: number }) => Promise<PreparedAttachmentUpload>,
): Promise<UploadedAttachment> {
  const mimeType = file.type || "application/octet-stream";
  if (file.size <= APP_RELAY_MAX_BYTES) {
    try {
      return await uploadThroughApp(file, mimeType);
    } catch {
      // A direct B2 URL remains a valid second route if the app relay is busy.
    }
  }

  try {
    return await uploadDirectly(file, mimeType, prepareDirectUpload);
  } catch {
    throw new Error(file.size > APP_RELAY_MAX_BYTES
      ? "لم يكتمل رفع الملف الكبير الآن. لم يُنشَر أيّ محتوى؛ تحقّق من اتصالك ثم أعد المحاولة."
      : safeUploadMessage,
    );
  }
}
