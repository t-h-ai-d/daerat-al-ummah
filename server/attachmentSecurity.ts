export type AttachmentScanStatus = "pending" | "clean" | "blocked";

const highRiskExtension = /\.(?:exe|msi|msix|app|dmg|pkg|deb|rpm|apk|bat|cmd|com|scr|ps1|sh|bash|zsh|vbs|vbe|js|jse|wsf|wsh|jar|dll|so|dylib|iso)$/i;
const highRiskMimeType = /^(?:application\/(?:x-msdownload|x-dosexec|x-msi|x-sh|x-shellscript|x-executable|x-bat)|text\/(?:x-shellscript|x-script))$/i;

export function requiresAttachmentQuarantine(filename?: string | null, mimeType?: string | null) {
  return highRiskExtension.test(filename?.trim() ?? "") || highRiskMimeType.test(mimeType?.trim() ?? "");
}

export function attachmentScanStatus(filename?: string | null, mimeType?: string | null): AttachmentScanStatus {
  return requiresAttachmentQuarantine(filename, mimeType) ? "pending" : "clean";
}

export function isAttachmentDownloadAllowed(scanStatus: AttachmentScanStatus | null) {
  return scanStatus === "clean";
}

export const quarantinedAttachmentMessage = "هذا الملف محفوظ في الحجر الأمني بانتظار فحص خارجي؛ لا يمكن فتحه أو تنزيله الآن.";
