import axios from "axios";
import FormData from "form-data";
import { ENV } from "./_core/env";
import { storageGetPrivateReadStream } from "./storage";
import { updatePendingAttachmentScanStatus } from "./db";

export const VIRUSTOTAL_NORMAL_UPLOAD_BYTES = 32 * 1024 * 1024;
export const VIRUSTOTAL_MAX_PRIVATE_UPLOAD_BYTES = 650 * 1024 * 1024;
const VIRUSTOTAL_PRIVATE_API = "https://www.virustotal.com/api/v3/private";
const MAX_VERDICT_POLLS = 12;
const VERDICT_POLL_DELAY_MS = 5_000;

type AnalysisAttributes = {
  status?: string;
  stats?: Record<string, number>;
  results?: Record<string, { category?: string }>;
};

export function derivePrivateScanVerdict(attributes: AnalysisAttributes): "pending" | "clean" | "blocked" {
  if (attributes.status !== "completed") return "pending";
  const stats = attributes.stats ?? {};
  const detected = (stats.malicious ?? 0) + (stats.suspicious ?? 0);
  if (detected > 0) return "blocked";
  const resultDetected = Object.values(attributes.results ?? {}).some(result => result.category === "malicious" || result.category === "suspicious");
  return resultDetected ? "blocked" : "clean";
}

export function scannerEligibility(sizeBytes: number, apiKey = ENV.virusTotalApiKey): "ready" | "missing-key" | "oversize" | "invalid-size" {
  if (!apiKey.trim()) return "missing-key";
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "invalid-size";
  if (sizeBytes > VIRUSTOTAL_MAX_PRIVATE_UPLOAD_BYTES) return "oversize";
  return "ready";
}

function scannerHeaders() {
  if (!ENV.virusTotalApiKey.trim()) throw new Error("VirusTotal private-scanning key is not configured.");
  return { "x-apikey": ENV.virusTotalApiKey };
}

async function getPrivateUploadUrl(sizeBytes: number) {
  if (sizeBytes <= VIRUSTOTAL_NORMAL_UPLOAD_BYTES) return `${VIRUSTOTAL_PRIVATE_API}/files`;
  const response = await axios.get<{ data?: string }>(`${VIRUSTOTAL_PRIVATE_API}/files/upload_url`, { headers: scannerHeaders(), timeout: 20_000 });
  if (!response.data.data) throw new Error("VirusTotal did not return a large-file upload URL.");
  return response.data.data;
}

async function submitPrivateScan(input: { storageKey: string; filename: string; mimeType: string; sizeBytes: number }) {
  const { body, contentLength } = await storageGetPrivateReadStream(input.storageKey);
  const form = new FormData();
  form.append("file", body, {
    filename: input.filename,
    contentType: input.mimeType,
    knownLength: contentLength ?? input.sizeBytes,
  });
  const uploadUrl = await getPrivateUploadUrl(input.sizeBytes);
  const response = await axios.post<{ data?: { id?: string } }>(uploadUrl, form, {
    headers: { ...form.getHeaders(), ...scannerHeaders() },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 15 * 60_000,
  });
  const analysisId = response.data.data?.id;
  if (!analysisId) throw new Error("VirusTotal did not return a private scan analysis ID.");
  return analysisId;
}

async function getPrivateScanVerdict(analysisId: string) {
  const response = await axios.get<{ data?: { attributes?: AnalysisAttributes } }>(`${VIRUSTOTAL_PRIVATE_API}/analyses/${encodeURIComponent(analysisId)}`, {
    headers: scannerHeaders(),
    timeout: 20_000,
  });
  return derivePrivateScanVerdict(response.data.data?.attributes ?? {});
}

function sleep(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export async function queuePrivateAttachmentScan(input: { storageKey: string; filename: string; mimeType: string; sizeBytes: number }) {
  const eligibility = scannerEligibility(input.sizeBytes);
  if (eligibility !== "ready") return { status: "pending" as const, reason: eligibility };

  try {
    const analysisId = await submitPrivateScan(input);
    for (let attempt = 0; attempt < MAX_VERDICT_POLLS; attempt += 1) {
      const verdict = await getPrivateScanVerdict(analysisId);
      if (verdict === "pending") {
        await sleep(VERDICT_POLL_DELAY_MS);
        continue;
      }
      await updatePendingAttachmentScanStatus(input.storageKey, verdict);
      return { status: verdict, analysisId };
    }
    return { status: "pending" as const, analysisId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scanner error";
    console.error("[VirusTotal] private scan submission or verdict lookup failed", { storageKey: input.storageKey, message });
    return { status: "pending" as const, reason: "scanner-error" as const };
  }
}
