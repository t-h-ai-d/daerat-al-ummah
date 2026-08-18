import fs from "node:fs";

const sharedLimitBytes = 1_073_741_824;

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not locate ${label}`);
  }
  return source.slice(0, start) + replacement + source.slice(end);
}

function repairComposer(filePath, endMarker) {
  let source = fs.readFileSync(filePath, "utf8");
  if (!source.includes("trpc.social.uploadAttachment.useMutation")) {
    throw new Error(`Expected legacy upload mutation in ${filePath}`);
  }
  source = source.replace(
    /const\s+(?:upload|uploadAttachment)\s*=\s*trpc\.social\.uploadAttachment\.useMutation\([^;]*\);/,
    "const prepareAttachmentUpload = trpc.social.prepareAttachmentUpload.useMutation();\n  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false);",
  );
  source = source.replaceAll("upload.isPending", "isAttachmentUploading").replaceAll("uploadAttachment.isPending", "isAttachmentUploading");
  source = source.replaceAll(
    'accept="image/*,image/gif,video/*,.pdf,.txt,.doc,.docx,.xls,.xlsx"',
    'accept="*/*"',
  );
  source = source.replaceAll(
    "إرفاق صورة أو GIF أو فيديو أو ملف",
    "إرفاق ملف حتى 1 غيغابايت",
  );
  source = replaceBetween(
    source,
    "const onFileSelect = async",
    endMarker,
    `const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !ensureSignedIn()) return;
    if (attachments.length >= 5) return toast.error("يمكنك إرفاق خمسة عناصر كحد أقصى في المنشور الواحد.");
    if (file.size > ${sharedLimitBytes}) return toast.error("الحد المشترك لكل مرفق هو 1 غيغابايت.");
    setIsAttachmentUploading(true);
    try {
      const prepared = await prepareAttachmentUpload.mutateAsync({
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
      const response = await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": prepared.mimeType },
        body: file,
      });
      if (!response.ok) throw new Error("تعذّر رفع الملف إلى التخزين الآمن.");
      const { uploadUrl: _uploadUrl, sharedLimitBytes: _sharedLimitBytes, ...attachment } = prepared;
      setAttachments(current => [...current, attachment]);
      toast.success("تم رفع " + file.name + ".");
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "تعذّر رفع المرفق.";
      toast.error(message + " إن استمر الخطأ، تحقّق من إعداد CORS في Backblaze B2.");
    } finally {
      setIsAttachmentUploading(false);
    }
  };
  `,
    `${filePath} attachment handler`,
  );
  fs.writeFileSync(filePath, source);
}

repairComposer("client/src/pages/Home.tsx", "const sharePost");
repairComposer("client/src/pages/CommunitiesPage.tsx", "const publish");
console.log("Direct upload repair applied to home and communities composers.");
