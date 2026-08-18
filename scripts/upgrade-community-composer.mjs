import { readFileSync, writeFileSync } from "node:fs";

const path = "/home/ubuntu/ummah-circle/client/src/pages/CommunitiesPage.tsx";
let source = readFileSync(path, "utf8");

const additions = [
  [
    'type Attachment = { id?: number; kind: "image" | "gif" | "video" | "file" | "link"; url: string; storageKey?: string | null; filename?: string | null; mimeType?: string | null; sizeBytes?: number | null; scanStatus?: "pending" | "clean" | "blocked" };',
    'type Attachment = { id?: number; kind: "image" | "gif" | "video" | "file" | "link"; url: string; storageKey?: string | null; filename?: string | null; mimeType?: string | null; sizeBytes?: number | null; scanStatus?: "pending" | "clean" | "blocked" };\n\nconst SMALL_UPLOAD_FALLBACK_BYTES = 50_000_000;\n\nfunction isAudioOrVideo(mimeType?: string | null) { return Boolean(mimeType?.toLowerCase().startsWith("video/") || mimeType?.toLowerCase().startsWith("audio/")); }\n\nfunction readFileAsBase64(file: File) {\n  return new Promise<string>((resolve, reject) => {\n    const reader = new FileReader();\n    reader.onerror = () => reject(new Error("تعذّرت قراءة الملف."));\n    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");\n    reader.readAsDataURL(file);\n  });\n}',
  ],
  [
    'const prepareAttachmentUpload = trpc.social.prepareAttachmentUpload.useMutation();',
    'const prepareAttachmentUpload = trpc.social.prepareAttachmentUpload.useMutation();\n  const uploadAttachment = trpc.social.uploadAttachment.useMutation();\n  const discardAttachmentUpload = trpc.social.discardAttachmentUpload.useMutation();',
  ],
];

for (const [from, to] of additions) {
  if (!source.includes(from)) throw new Error(`Expected community composer fragment missing: ${from.slice(0, 80)}`);
  source = source.replace(from, to);
}

const handlerStart = '  const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {';
const handlerEnd = '  const publish = (event: React.FormEvent) => {';
const startIndex = source.indexOf(handlerStart);
const endIndex = source.indexOf(handlerEnd);
if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) throw new Error("Community upload handler markers were not found.");
const replacement = `  const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || !ensureSignedIn()) return;
    const acceptedFiles: File[] = [];
    let mediaAlreadyAdded = attachments.some(attachment => isAudioOrVideo(attachment.mimeType));
    for (const file of files) {
      if (file.size > 1_073_741_824) { toast.error(\`تجاوز «\${file.name}» الحد المشترك للمرفق: 1 غيغابايت.\`); continue; }
      if (isAudioOrVideo(file.type)) {
        if (mediaAlreadyAdded) { toast.error(\`لم يُضف «\${file.name}»: يُسمح بفيديو أو صوت واحد فقط في المنشور.\`); continue; }
        mediaAlreadyAdded = true;
      }
      acceptedFiles.push(file);
    }
    if (!acceptedFiles.length) return;
    setIsAttachmentUploading(true);
    try {
      for (const file of acceptedFiles) {
        const mimeType = file.type || "application/octet-stream";
        try {
          const prepared = await prepareAttachmentUpload.mutateAsync({ filename: file.name, mimeType, sizeBytes: file.size });
          const response = await fetch(prepared.uploadUrl, { method: "PUT", headers: { "Content-Type": prepared.mimeType }, body: file });
          if (!response.ok) throw new Error("تعذّر رفع الملف إلى التخزين الآمن.");
          const { uploadUrl: _uploadUrl, sharedLimitBytes: _sharedLimitBytes, ...attachment } = prepared;
          setAttachments(current => [...current, attachment]);
          if (prepared.scanStatus === "pending") toast.message("رُفع الملف إلى الحجر الأمني؛ لن يُفتح أو يُنزّل قبل اكتمال الفحص الخارجي.");
        } catch {
          if (file.size > SMALL_UPLOAD_FALLBACK_BYTES) throw new Error(\`تعذّر رفع «\${file.name}» مباشرةً. الملف أكبر من 50 ميغابايت، ويجب تفعيل CORS في Backblaze B2 للرفع المباشر.\`);
          const fallback = await uploadAttachment.mutateAsync({ filename: file.name, mimeType, dataBase64: await readFileAsBase64(file) });
          setAttachments(current => [...current, fallback]);
          toast.message(\`تم رفع «\${file.name}» عبر المسار الاحتياطي؛ أصلح CORS في Backblaze للملفات الكبيرة.\`);
        }
      }
      toast.success(\`تمت إضافة \${acceptedFiles.length} مرفق/مرفقات. يمكنك حذف أي واحد قبل النشر.\`);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "تعذّر رفع المرفق.");
    } finally { setIsAttachmentUploading(false); }
  };
  const removeSelectedAttachment = async (attachment: Attachment, index: number) => {
    if (attachment.storageKey) {
      try { await discardAttachmentUpload.mutateAsync({ storageKey: attachment.storageKey }); }
      catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر حذف الملف من التخزين."); return; }
    }
    setAttachments(current => current.filter((_, itemIndex) => itemIndex !== index));
    toast.success("تم حذف المرفق قبل النشر.");
  };
`;
source = source.slice(0, startIndex) + replacement + source.slice(endIndex);

const interfaceReplacements = [
  [
    'attachment.kind === "image" || attachment.kind === "gif" ? <ImagePlus size={13} /> : attachment.kind === "video" ? <Video size={13} /> : <FileText size={13} />',
    'attachment.kind === "image" || attachment.kind === "gif" ? <ImagePlus size={13} /> : isAudioOrVideo(attachment.mimeType) ? <Video size={13} /> : <FileText size={13} />',
  ],
  [
    'onClick={() => setAttachments(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-md px-1 py-0.5 text-[#6d8f7d] hover:bg-white hover:text-[#a14f36]" aria-label="حذف المرفق"',
    'onClick={() => void removeSelectedAttachment(attachment, index)} disabled={discardAttachmentUpload.isPending} className="rounded-md px-1 py-0.5 text-[#6d8f7d] hover:bg-white hover:text-[#a14f36] disabled:opacity-50" aria-label={`حذف ${attachment.filename || "المرفق"}`}',
  ],
  [
    'type="file" className="hidden" accept="*/*" onChange={onFileSelect}',
    'type="file" className="hidden" accept="*/*" multiple onChange={onFileSelect}',
  ],
  [
    'aria-label="إرفاق ملف حتى 1 غيغابايت"',
    'aria-label="إرفاق عدة ملفات؛ حتى 1 غيغابايت لكل ملف" title="إرفاق عدة ملفات؛ حتى 1 غيغابايت لكل ملف"',
  ],
];
for (const [from, to] of interfaceReplacements) {
  if (!source.includes(from)) throw new Error(`Expected community UI fragment missing: ${from.slice(0, 80)}`);
  source = source.replace(from, to);
}

writeFileSync(path, source);
