import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Eye, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Attachment = {
  kind: "image" | "gif" | "video" | "file" | "link";
  url: string;
  filename?: string | null;
  mimeType?: string | null;
  scanStatus?: "pending" | "clean" | "blocked";
};

function labelFor(attachment: Attachment) {
  if (attachment.kind === "video") return "الفيديو";
  if (attachment.kind === "gif") return "الصورة المتحركة";
  if (attachment.kind === "image") return "الصورة";
  return "الملف";
}

export default function AttachmentActions({ attachment }: { attachment: Attachment }) {
  const [open, setOpen] = useState(false);
  const canView = attachment.kind === "image" || attachment.kind === "gif" || attachment.kind === "video";
  const filename = attachment.filename || labelFor(attachment);
  const share = async () => {
    const payload = { title: filename, text: `مرفق من دائرة الأمة: ${filename}`, url: attachment.url };
    try {
      if (navigator.share) await navigator.share(payload);
      else {
        await navigator.clipboard.writeText(attachment.url);
        toast.success("نُسخ رابط المرفق.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("تعذّرت مشاركة المرفق الآن.");
    }
  };

  return <div className="mt-2 flex flex-wrap items-center gap-2" dir="rtl">
    {canView && <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button type="button" variant="outline" size="sm" className="h-8 rounded-lg border-[#d5e2d5] bg-white text-xs text-[#275b48] hover:bg-[#edf5ed]"><Eye size={14} />عرض</Button></DialogTrigger><DialogContent dir="rtl" className="max-h-[92vh] max-w-4xl overflow-y-auto border-[#dce7dc] bg-[#fbfdf9]"><DialogHeader><DialogTitle className="text-right text-[#24483d]">{filename}</DialogTitle></DialogHeader>{attachment.kind === "video" ? <video controls autoPlay preload="metadata" className="max-h-[72vh] w-full rounded-xl bg-[#173d32]"><source src={attachment.url} type={attachment.mimeType || "video/mp4"} />لا يدعم متصفحك تشغيل هذا الفيديو.</video> : <img src={attachment.url} alt={filename} className="max-h-[72vh] w-full rounded-xl object-contain" />}</DialogContent></Dialog>}
    <a href={attachment.url} target="_blank" rel="noreferrer" download={attachment.filename || undefined} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#d5e2d5] bg-white px-3 text-xs font-medium text-[#275b48] transition-colors hover:bg-[#edf5ed]"><Download size={14} />تنزيل</a>
    <Button type="button" variant="outline" size="sm" onClick={() => void share()} className="h-8 rounded-lg border-[#d5e2d5] bg-white text-xs text-[#275b48] hover:bg-[#edf5ed]"><Share2 size={14} />مشاركة</Button>
  </div>;
}
