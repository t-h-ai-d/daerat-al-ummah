import { useAuth } from "@/_core/hooks/useAuth";
import EmojiPicker from "@/components/EmojiPicker";
import PlatformShell from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ownerReviewMailto } from "@/lib/ownerReview";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowUpRight, Bookmark, FileText, Heart, ImagePlus, Link2, Loader2, MessageCircle, MoreHorizontal, Repeat2, Send, ShieldAlert, Sparkles, Upload, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type Attachment = {
  id?: number;
  kind: "image" | "gif" | "video" | "file" | "link";
  url: string;
  storageKey?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

type FeedPost = {
  id: number;
  author: { id: number; name: string | null; username: string | null; avatarUrl: string | null };
  content: string;
  createdAt: Date;
  attachments: Attachment[];
  likeCount: number;
  commentCount: number;
  repostCount: number;
  likedByViewer: boolean;
  repostedByViewer: boolean;
};

type MediaFilter = "all" | Attachment["kind"];
type VisibilityFilter = "all" | "public";
type FeedMode = "following" | "chronological" | "balanced";

const ownerReportEmail = "ssbmbwuugame@gmail.com";
const containsArabic = (value: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);

function Avatar({ initials, tone = "emerald" }: { initials: string; tone?: "emerald" | "gold" }) {
  const palette = { emerald: "bg-[#dcece1] text-[#176047]", gold: "bg-[#f2e5b9] text-[#805f14]" };
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[15px] text-xs font-extrabold ${palette[tone]}`}>{initials}</span>;
}

function getInitials(value?: string | null) {
  return (value || "د")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === "image" || attachment.kind === "gif") {
    return <img src={attachment.url} alt={attachment.filename || (attachment.kind === "gif" ? "صورة GIF مرفقة" : "صورة مرفقة")} className={`mt-4 max-h-[440px] w-full rounded-2xl border border-[#e0e8de] ${attachment.kind === "gif" ? "object-contain bg-[#f7faf6]" : "object-cover"}`} />;
  }
  if (attachment.kind === "video") {
    return <video controls preload="metadata" className="mt-4 max-h-[440px] w-full rounded-2xl border border-[#e0e8de] bg-[#183b32]"><source src={attachment.url} type={attachment.mimeType || "video/mp4"} />لا يدعم متصفحك تشغيل هذا الفيديو.</video>;
  }
  if (attachment.kind === "file") {
    return <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-[#e0e8de] bg-[#fafcf9] p-3 transition-colors hover:border-[#b9d0bd]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e1ebdf] text-[#2a6651]"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#24483d]">{attachment.filename || "ملف مرفق"}</p><p className="mt-0.5 text-[11px] text-[#809488]">افتح الملف في علامة تبويب جديدة</p></div><ArrowUpRight size={16} className="text-[#5b8875]" /></a>;
  }
  return <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-[#e0e8de] bg-[#fafcf9] p-3 transition-colors hover:border-[#b9d0bd]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e1ebdf] text-[#2a6651]"><Link2 size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#24483d]">{attachment.filename || attachment.url.replace(/^https?:\/\//, "")}</p><p className="mt-0.5 text-[11px] text-[#809488]">رابط مرفق</p></div><ArrowUpRight size={16} className="text-[#5b8875]" /></a>;
}

function PostCard({ post, onLike, onRepost, onComment, onReport }: { post: FeedPost; onLike: () => void; onRepost: () => void; onComment: () => void; onReport: () => void }) {
  const name = post.author.name || post.author.username || "عضو في الدائرة";
  return <article className="rounded-[22px] border border-[#dfe6dc] bg-white p-4 shadow-[0_10px_30px_rgba(21,54,43,0.035)] sm:p-5"><div className="flex gap-3"><Avatar initials={getInitials(name)} tone="emerald" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="truncate text-sm font-extrabold text-[#193d33]">{name}</p>{post.author.username && <span className="text-xs text-[#809488]">@{post.author.username}</span>}<span className="text-xs text-[#a4b1a8]">·</span><span className="text-xs text-[#809488]">{new Date(post.createdAt).toLocaleDateString("ar")}</span></div></div><button onClick={onReport} className="grid h-8 w-8 place-items-center rounded-lg text-[#8a9b92] transition-colors hover:bg-[#f9efeb] hover:text-[#a14f36]" aria-label="الإبلاغ بالبريد الإلكتروني" title="إرسال بلاغ بالبريد الإلكتروني"><MoreHorizontal size={18} /></button></div><p dir={containsArabic(post.content) ? "rtl" : "auto"} className={`mt-3 whitespace-pre-line text-[14px] leading-6 text-[#38574b] ${containsArabic(post.content) ? "arabic-content" : ""}`}>{post.content}</p>{post.attachments.map((attachment, index) => <AttachmentPreview attachment={attachment} key={attachment.id ?? `${attachment.url}-${index}`} />)}<div className="mt-4 flex items-center justify-between border-t border-[#edf0ea] pt-3"><button onClick={onComment} className="action-button"><MessageCircle size={17} /><span>{post.commentCount || "تعليق"}</span></button><button onClick={onRepost} className={`action-button ${post.repostedByViewer ? "text-[#267052]" : ""}`}><Repeat2 size={17} /><span>{post.repostCount || "إعادة نشر"}</span></button><button onClick={onLike} className={`action-button ${post.likedByViewer ? "text-[#b75356]" : ""}`}><Heart size={17} fill={post.likedByViewer ? "currentColor" : "none"} /><span>{post.likeCount || "إعجاب"}</span></button><button onClick={() => toast.success("حُفظ في إشاراتك الخاصة.")} className="action-button" aria-label="حفظ المنشور"><Bookmark size={16} /></button></div></div></div></article>;
}

function CircleGuidance({ compact = false }: { compact?: boolean }) {
  return <aside className={`space-y-4 ${compact ? "" : "lg:pt-[104px]"}`}><section className="rounded-[22px] border border-[#dce5da] bg-[#fbfcf8] p-5"><div className="flex items-center gap-2 text-[#1c5844]"><ShieldAlert size={18} /><h2 className="text-sm font-extrabold">معيار الدائرة</h2></div><div className="mt-4 space-y-3">{["تكلّم بصدق وتثبّت مما تشارك.", "احمِ الناس من الاحتيال والتلاعب.", "اختر المحتوى النافع بدل التشتيت المتواصل.", "عامل الهويات الإسلامية بكرامة ومن دون تحيّز."].map((rule, index) => <div key={rule} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e5efe5] text-[10px] font-extrabold text-[#237052]">0{index + 1}</span><p className="text-xs leading-5 text-[#567367]">{rule}</p></div>)}</div></section><section className="rounded-[22px] border border-[#e1d5ad] bg-[#f7f1db] p-5"><p className="text-[10px] font-bold tracking-[0.18em] text-[#8a6e27]">نية اليوم</p><p className="mt-2 font-display text-lg font-semibold leading-6 text-[#405542]">«النفع قبل المظاهر، والحضور بلا ضغط.»</p><p className="mt-3 text-xs leading-5 text-[#71816c]">استخدم خلاصتك بنية: تعلّم، ساهم، وتواصل.</p></section></aside>;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [feedMode, setFeedMode] = useState<FeedMode>("following");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>(() => (typeof window !== "undefined" ? (localStorage.getItem("ummah-media-filter") as MediaFilter | null) || "all" : "all"));
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>(() => (typeof window !== "undefined" ? (localStorage.getItem("ummah-visibility-filter") as VisibilityFilter | null) || "all" : "all"));
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [showFeedLoading, setShowFeedLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const authorName = user?.name || "عضو";
  const authorInitials = useMemo(() => getInitials(authorName), [authorName]);

  useEffect(() => {
    const syncMediaFilter = () => setMediaFilter((localStorage.getItem("ummah-media-filter") as MediaFilter | null) || "all");
    window.addEventListener("ummah-media-filter", syncMediaFilter);
    return () => window.removeEventListener("ummah-media-filter", syncMediaFilter);
  }, []);
  useEffect(() => {
    const syncVisibilityFilter = () => setVisibilityFilter((localStorage.getItem("ummah-visibility-filter") as VisibilityFilter | null) || "all");
    window.addEventListener("ummah-visibility-filter", syncVisibilityFilter);
    return () => window.removeEventListener("ummah-visibility-filter", syncVisibilityFilter);
  }, []);

  const feedQuery = trpc.social.feed.useQuery({ mode: feedMode, ...(mediaFilter === "all" ? {} : { mediaType: mediaFilter }), ...(visibilityFilter === "all" ? {} : { visibilityScope: visibilityFilter }) });
  useEffect(() => {
    setShowFeedLoading(true);
    if (!feedQuery.isLoading) {
      setShowFeedLoading(false);
      return;
    }
    const timeout = window.setTimeout(() => setShowFeedLoading(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [feedMode, mediaFilter, visibilityFilter, feedQuery.isLoading]);
  const createPost = trpc.social.createPost.useMutation({ onSuccess: async result => { await Promise.all([utils.social.feed.invalidate(), utils.social.myPosts.invalidate()]); setContent(""); setAttachments([]); setLinkUrl(""); setShowLink(false); setAcknowledged(false); setRulesOpen(false); if (result.moderation.status === "under_review") toast.message(result.moderation.message, { duration: 10_000, action: { label: "مراسلة المالك", onClick: () => { window.location.href = ownerReviewMailto(result.postId); } } }); else toast.success("نُشر محتواك في الدائرة."); }, onError: error => toast.error(error.message) });
  const upload = trpc.social.uploadAttachment.useMutation({ onError: error => toast.error(error.message) });
  const like = trpc.social.toggleLike.useMutation({ onSuccess: () => utils.social.feed.invalidate(), onError: error => toast.error(error.message) });
  const repost = trpc.social.toggleRepost.useMutation({ onSuccess: () => utils.social.feed.invalidate(), onError: error => toast.error(error.message) });
  const addComment = trpc.social.addComment.useMutation({ onSuccess: () => { utils.social.feed.invalidate(); setComment(""); setCommentOpen(false); toast.success("نُشر تعليقك."); }, onError: error => toast.error(error.message) });

  const ensureSignedIn = () => {
    if (isAuthenticated) return true;
    toast.info("سجّل الدخول للمشاركة في الدائرة.");
    setLocation("/auth");
    return false;
  };
  const appendEmoji = (emoji: string) => setContent(current => `${current}${current ? " " : ""}${emoji}`);
  const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !ensureSignedIn()) return;
    if (attachments.length >= 5) return toast.error("يمكنك إرفاق خمسة عناصر كحد أقصى في المنشور الواحد.");
    const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("تعذّرت قراءة الملف.")); reader.readAsDataURL(file); });
    try { const item = await upload.mutateAsync({ filename: file.name, mimeType: file.type || "application/octet-stream", dataBase64: base64 }); setAttachments(current => [...current, item]); toast.success(`أُرفق ${file.name}.`); } catch { /* The mutation displays its own error. */ }
  };
  const addLink = () => {
    if (!linkUrl.trim()) return;
    try { new URL(linkUrl.trim()); } catch { return toast.error("ألصق رابطًا صالحًا."); }
    if (attachments.length >= 5) return toast.error("يمكنك إرفاق خمسة عناصر كحد أقصى في المنشور الواحد.");
    setAttachments(current => [...current, { kind: "link", url: linkUrl.trim(), filename: linkUrl.replace(/^https?:\/\//, "") }]);
    setLinkUrl("");
    setShowLink(false);
  };
  const beginSubmission = () => { if (!ensureSignedIn()) return; if (!content.trim()) return toast.error("اكتب ملاحظة نافعة قبل النشر."); setRulesOpen(true); };
  const sharePost = () => { if (!acknowledged) return toast.error("أكد تذكير قواعد الدائرة قبل النشر."); createPost.mutate({ content: content.trim(), visibility: "public", attachments: attachments.map(item => ({ kind: item.kind, url: item.url, storageKey: item.storageKey ?? null, filename: item.filename ?? null, mimeType: item.mimeType ?? null, sizeBytes: item.sizeBytes ?? null })) }); };
  const interact = (postId: number, action: "like" | "repost" | "comment") => { if (!ensureSignedIn()) return; if (action === "like") like.mutate({ postId }); if (action === "repost") repost.mutate({ postId }); if (action === "comment") { setSelectedPostId(postId); setCommentOpen(true); } };
  const reportByEmail = (post: FeedPost) => {
    const postAuthor = post.author.username ? `@${post.author.username}` : (post.author.name || "غير معروف");
    const body = `السلام عليكم،\n\nأرغب في الإبلاغ عن منشور في دائرة الأمة.\n\nمعرّف المنشور: ${post.id}\nصاحب المنشور: ${postAuthor}\nتاريخ النشر: ${new Date(post.createdAt).toLocaleString("ar")}\n\nالتصنيف (اختر واحدًا): احتيال / كذب / محتوى مُفسد للعقل / صور محرّمة\nالتفاصيل أو الرابط إن وُجد:\n\n`;
    window.location.href = `mailto:${ownerReportEmail}?subject=${encodeURIComponent(`بلاغ عن منشور #${post.id} في دائرة الأمة`)}&body=${encodeURIComponent(body)}`;
  };
  const submitComment = () => { if (selectedPostId && comment.trim()) addComment.mutate({ postId: selectedPostId, content: comment.trim() }); };
  const posts = (feedQuery.data ?? []) as FeedPost[];

  const shouldShowEmpty = !showFeedLoading && (!posts.length || feedQuery.isError);
  return <PlatformShell><div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9"><div className="mb-6 lg:hidden"><CircleGuidance compact /></div><div className="grid gap-8 lg:grid-cols-[minmax(0,680px)_280px]"><section className="min-w-0"><div className="relative mb-6 overflow-hidden rounded-[25px] border border-[#dbe4d6] bg-[#0e3b31] px-5 py-5 text-[#f5f5ea] shadow-[0_16px_42px_rgba(13,59,49,0.16)] sm:px-6"><div className="geometric-orb" aria-hidden="true" /><div className="relative flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.19em] text-[#e6c96e]">خلاصتك الهادئة</p><h1 className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">السلام عليكم، {isAuthenticated ? authorName.split(" ")[0] : "صديق الدائرة"}.</h1><p className="mt-2 max-w-md text-sm leading-5 text-[#cfddd3]">لا تشغيل تلقائي، ولا تمرير بلا نهاية. فقط الناس والأفكار التي تختار متابعتها.</p></div><div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#688777]/60 bg-white/10 text-[#e1c065] sm:grid"><Sparkles size={22} /></div></div></div><div className="mb-5 flex items-center gap-5 overflow-x-auto border-b border-[#dfe5dc] px-1">{(["following", "chronological", "balanced"] as const).map(mode => <button key={mode} onClick={() => setFeedMode(mode)} className={`relative shrink-0 pb-3 text-sm font-bold transition-colors ${feedMode === mode ? "text-[#12563f]" : "text-[#82958b] hover:text-[#386656]"}`}>{mode === "following" ? "المتابَعون" : mode === "chronological" ? "الأحدث" : "مُوازَن"}{feedMode === mode && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#bd9941]" />}</button>)}</div>{feedMode === "balanced" && <p className="-mt-1 mb-4 px-1 text-[11px] leading-5 text-[#799085]">الخلاصة المُوازَنة محدودة: تُحافِظ على الحَداثة وتُنوِّع الكُتّاب. لا تعتمد على الإعجابات أو الوقت الذي تقضيه في التمرير.</p>}<div className="rounded-[22px] border border-[#dce6dc] bg-white p-4 shadow-[0_10px_28px_rgba(27,66,49,0.035)] sm:p-5"><div className="flex gap-3"><Avatar initials={authorInitials} tone="gold" /><div className="min-w-0 flex-1"><Textarea dir="auto" lang={containsArabic(content) ? "ar" : undefined} value={content} onChange={event => setContent(event.target.value)} placeholder="شارك شيئًا نافعًا مع دائرتك…" className={`min-h-[88px] resize-none border-0 bg-transparent p-0 text-[15px] leading-6 text-[#284b3e] shadow-none placeholder:text-[#9ba9a0] focus-visible:ring-0 ${containsArabic(content) ? "arabic-content" : ""}`} />{attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{attachments.map((attachment, index) => <span key={`${attachment.url}-${index}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf4ee] py-1.5 pl-2.5 pr-1 text-[11px] font-bold text-[#416d5b]">{attachment.kind === "image" || attachment.kind === "gif" ? <ImagePlus size={13} /> : attachment.kind === "video" ? <Video size={13} /> : attachment.kind === "file" ? <FileText size={13} /> : <Link2 size={13} />}<span className="max-w-32 truncate">{attachment.kind === "gif" ? "GIF" : attachment.filename || attachment.kind}</span><button onClick={() => setAttachments(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-md px-1 py-0.5 text-[#6d8f7d] hover:bg-white hover:text-[#a14f36]" aria-label="حذف المرفق">×</button></span>)}</div>}{showLink && <div className="mt-3 flex gap-2"><Input dir="ltr" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addLink(); } }} placeholder="https://example.com/resource" className="h-10 rounded-xl border-[#dbe5dc] bg-[#fafcf9] text-left text-xs" /><Button onClick={addLink} type="button" variant="outline" className="h-10 rounded-xl text-xs">إضافة رابط</Button></div>}<div className="mt-3 flex items-center justify-between gap-3 border-t border-[#edf1eb] pt-3"><div className="flex items-center gap-1"><input ref={inputRef} type="file" className="hidden" accept="image/*,image/gif,video/*,.pdf,.txt,.doc,.docx,.xls,.xlsx" onChange={onFileSelect} /><button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="composer-icon" aria-label="إرفاق صورة أو GIF أو فيديو أو ملف" title="إرفاق صورة أو GIF أو فيديو أو ملف">{upload.isPending ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}</button><EmojiPicker onSelect={appendEmoji} disabled={upload.isPending} className="h-9 w-9 rounded-xl text-[#467566] hover:bg-[#e8f1e7] hover:text-[#176047]" /><button onClick={() => setShowLink(value => !value)} className={`composer-icon ${showLink ? "bg-[#e1eee4] text-[#176147]" : ""}`} aria-label="إضافة رابط"><Link2 size={18} /></button></div><Button onClick={beginSubmission} disabled={createPost.isPending || upload.isPending} className="h-9 rounded-xl bg-[#0d4937] px-4 text-xs font-extrabold shadow-none hover:bg-[#176047]"><Send size={15} />انشر بأدب</Button></div></div></div></div><p className="mt-2 px-2 text-[11px] leading-4 text-[#799085]">يمكنك مشاركة النصوص والروابط والصور وملفات GIF والفيديوهات والملفات. تُحفَظ الحركات والشدة العربية كما كتبت.</p><div className="mt-5 space-y-4">{showFeedLoading ? <div className="feed-loader rounded-[22px] border border-[#dfe6dc] bg-white py-12 text-sm text-[#6c8579]"><span className="feed-loader__dot" /><span>يَجري تَجْهِيزُ الخُلاصَةِ…</span></div> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} onLike={() => interact(post.id, "like")} onRepost={() => interact(post.id, "repost")} onComment={() => interact(post.id, "comment")} onReport={() => reportByEmail(post)} />) : shouldShowEmpty ? <div className="feed-empty rounded-[22px] border border-dashed border-[#c9d9cc] bg-[#fbfcf8] px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e6f0e5] text-[#276c4e]"><Sparkles size={21} /></span><h2 className="mt-4 font-display text-xl font-semibold text-[#294d40]">الدَّائِرَةُ فارِغَةٌ</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#778d81]">لا توجد منشورات في هذه الخلاصة الآن. شارك فكرة نافعة، أو اختر خلاصة أخرى، ثم عُد عندما تشاء.</p></div> : null}<div className="rounded-[18px] border border-[#e0d5ae] bg-[#f9f3e2] px-5 py-4 text-center"><p className="text-xs font-bold text-[#6d704e]">وصلت إلى نهاية الخلاصة. خذ وقتك؛ الدائرة ستبقى هنا.</p></div></div></section><div className="hidden lg:block"><CircleGuidance /></div></div></div><Dialog open={rulesOpen} onOpenChange={setRulesOpen}><DialogContent dir="rtl" className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><span className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-[#e4efdf] text-[#176147]"><ShieldAlert size={21} /></span><DialogTitle className="font-display text-2xl tracking-[-0.035em] text-[#174035]">انشر بأدب</DialogTitle><DialogDescription className="pt-1 leading-6 text-[#688075]">تذكير سريع عند النشر: اجعل كلماتك صادقة ونافعة ومحترمة.</DialogDescription></DialogHeader><div className="rounded-xl border border-[#dfe9de] bg-white p-4 text-xs leading-5 text-[#547468]">بنشر هذا المحتوى، تؤكد أنه لا يتضمن <strong>احتيالًا</strong> أو <strong>كذبًا</strong> أو <strong>محتوى مفسدًا للعقل</strong> أو <strong>صورًا محرمة</strong>، وأنه يحترم المسلمين من دون تحيز.</div><label className="mt-1 flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2 text-sm font-semibold text-[#315447]"><Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} className="mt-0.5 border-[#8eaa9a] data-[state=checked]:bg-[#176047]" />أفهم قواعد الدائرة وأوافق عليها.</label><DialogFooter className="mt-2"><Button variant="outline" onClick={() => setRulesOpen(false)} className="rounded-xl">رجوع</Button><Button onClick={sharePost} disabled={createPost.isPending} className="rounded-xl bg-[#0d4937] hover:bg-[#176047]">تأكيد النشر</Button></DialogFooter></DialogContent></Dialog><Dialog open={commentOpen} onOpenChange={setCommentOpen}><DialogContent dir="rtl" className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><DialogTitle className="font-display text-2xl tracking-[-0.035em] text-[#174035]">علّق بأدب</DialogTitle><DialogDescription className="pt-1 leading-6 text-[#688075]">أضف إلى النقاش كلامًا صادقًا ونافعًا ومحترمًا.</DialogDescription></DialogHeader><div className="relative"><Textarea dir="auto" lang={containsArabic(comment) ? "ar" : undefined} value={comment} onChange={event => setComment(event.target.value)} placeholder="اكتب تعليقًا نافعًا…" className={`min-h-28 rounded-xl border-[#dce6dc] pl-11 ${containsArabic(comment) ? "arabic-content" : ""}`} /><div className="absolute bottom-2 left-2"><EmojiPicker onSelect={emoji => setComment(current => `${current}${current ? " " : ""}${emoji}`)} /></div></div><DialogFooter><Button variant="outline" onClick={() => setCommentOpen(false)} className="rounded-xl">إلغاء</Button><Button onClick={submitComment} disabled={!comment.trim() || addComment.isPending} className="rounded-xl bg-[#0d4937] hover:bg-[#176047]">نشر التعليق</Button></DialogFooter></DialogContent></Dialog></PlatformShell>;
}
