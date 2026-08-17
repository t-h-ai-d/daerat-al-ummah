import { useAuth } from "@/_core/hooks/useAuth";
import PlatformShell from "@/components/PlatformShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertTriangle, ArrowUpRight, Bookmark, FileText, Heart, ImagePlus, Link2, Loader2, MessageCircle, MoreHorizontal, Play, Repeat2, Send, ShieldAlert, Sparkles, Upload, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";

type Attachment = { id?: number; kind: "image" | "video" | "file" | "link"; url: string; storageKey?: string | null; filename?: string | null; mimeType?: string | null; sizeBytes?: number | null };
type FeedPost = { id: number; author: { id: number; name: string | null; username: string | null; avatarUrl: string | null }; content: string; createdAt: Date; attachments: Attachment[]; likeCount: number; commentCount: number; repostCount: number; likedByViewer: boolean; repostedByViewer: boolean };
type MediaFilter = "all" | Attachment["kind"];
type VisibilityFilter = "all" | "public";

const reportCategories = ["scam", "lie", "brainrot", "haram imagery"] as const;
const containsArabic = (value: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);

const arabicUi: Record<string, string> = {
  "Your mindful feed": "خلاصتك الهادئة",
  "As-salamu alaykum,": "السلام عليكم،",
  "No autoplay. No infinite scroll. Just the people and ideas you choose to receive.": "لا تشغيل تلقائي. لا تمرير بلا نهاية. فقط الأشخاص والأفكار التي تختار متابعتها.",
  "Following": "المتابَعون",
  "Chronological": "الأحدث",
  "Trending": "المتداول",
  "Share something beneficial with your circle…": "شارك شيئاً نافعاً مع دائرتك…",
  "Share with adab": "انشر بأدب",
  "A clear space, ready for benefit": "مساحة هادئة، جاهزة للنفع",
  "There are no posts in this view yet. Share a useful thought or choose another intentional view.": "لا توجد منشورات في هذه الخلاصة بعد. شارك فكرة نافعة أو اختر خلاصة أخرى.",
  "You are caught up. Step away when you are ready — the circle will still be here.": "وصلت إلى نهاية الخلاصة. خذ وقتك؛ الدائرة ستبقى هنا.",
  "Reply": "تعليق",
  "Repost": "إعادة نشر",
  "Like": "إعجاب",
  "Add link": "إضافة رابط",
  "Shared link": "رابط مُشارك",
  "Shared file": "ملف مُشارك",
  "Open file in a new tab": "افتح الملف في علامة تبويب جديدة",
  "Your browser does not support this video.": "متصفحك لا يدعم تشغيل هذا الفيديو.",
  "Trending is an optional, finite view of the day’s most discussed posts. It is never your default feed.": "المتداول عرض اختياري ومحدود لأهم أحاديث اليوم، وليس خلاصتك الافتراضية.",
  "Creators can share text, links, images, videos, and files. Arabic harakāt and shaddah are preserved exactly.": "يمكن للمبدعين مشاركة النصوص والروابط والصور والفيديوهات والملفات. تُحفَظ الحركات والشدة العربية كما كُتبت.",
  "Loading your circle…": "يجري تحميل الدائرة…",
  "A quick reminder at the point of submission: your words should be truthful, useful, and respectful.": "تذكير عند النشر: اجعل كلماتك صادقة ونافعة ومحترمة.",
  "I understand and agree to the community rules.": "أفهم قواعد الدائرة وأوافق عليها.",
  "Go back": "رجوع",
  "Confirm & share": "تأكيد النشر",
  "Reply with care": "علّق بأدب",
  "Add something true, useful, and respectful to the discussion.": "أضف إلى النقاش كلاماً صادقاً نافعاً ومحترماً.",
  "Cancel": "إلغاء",
  "Report with care": "بلّغ بأدب",
  "Choose the clearest category. Reports are sent to moderators for review, not public shaming.": "اختر الفئة الأدق. تصل البلاغات إلى المشرفين للمراجعة لا للتشهير العلني.",
  "Submit report": "إرسال البلاغ",
  "By sharing, you confirm that this post does not contain a": "بنشر هذا المحتوى، تؤكد أنه لا يتضمن",
  "and that it respects fellow Muslims without bias.": "وأنه يحترم المسلمين من دون تحيّز.",
  "Speak truthfully and cite what you share.": "تكلّم بصدق وتثبّت مما تشارك.",
  "Protect people from scams and manipulation.": "احمِ الناس من الاحتيال والتلاعب.",
  "Choose beneficial content over endless distraction.": "اختر المحتوى النافع بدل التشتيت المتواصل.",
  "Treat Islamic identities with dignity and without bias.": "عامل الهويات الإسلامية بكرامة ومن دون تحيّز.",
  "Today’s intention": "نية اليوم",
  "Benefit over vanity. Presence over pressure.": "النفع قبل المظاهر، والحضور بلا ضغط.",
  "Use your feed with intention: learn, contribute, and reconnect.": "استخدم خلاصتك بنية: تعلّم، ساهم، وتواصل.",
  "scam": "احتيال",
  "lie": "كذب",
  "brainrot": "محتوى مُفسد للعقل",
  "haram imagery": "صور محرّمة",
};

function translateHomeUi() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach(node => {
    const source = node.nodeValue?.trim();
    if (source && arabicUi[source]) node.nodeValue = node.nodeValue?.replace(source, arabicUi[source]) ?? node.nodeValue;
  });
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach(field => {
    const placeholders: Record<string, string> = {
      "Share something beneficial with your circle…": "شارك شيئاً نافعاً مع دائرتك…",
      "Write a thoughtful reply…": "اكتب تعليقاً نافعاً…",
      "Optional context for moderators": "تفاصيل اختيارية للمشرفين",
    };
    if (placeholders[field.placeholder]) field.placeholder = placeholders[field.placeholder];
  });
}

function Avatar({ initials, tone = "emerald" }: { initials: string; tone?: "emerald" | "gold" | "ink" }) {
  const palette = { emerald: "bg-[#dcece1] text-[#176047]", gold: "bg-[#f2e5b9] text-[#805f14]", ink: "bg-[#dce3e5] text-[#2c515d]" };
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[15px] text-xs font-extrabold ${palette[tone]}`}>{initials}</span>;
}

function getInitials(value?: string | null) {
  return (value || "UC").split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (attachment.kind === "image") return <img src={attachment.url} alt={attachment.filename || "Shared image"} className="mt-4 max-h-[440px] w-full rounded-2xl border border-[#e0e8de] object-cover" />;
  if (attachment.kind === "video") return <video controls preload="metadata" className="mt-4 max-h-[440px] w-full rounded-2xl border border-[#e0e8de] bg-[#183b32]"><source src={attachment.url} type={attachment.mimeType || "video/mp4"} />Your browser does not support this video.</video>;
  if (attachment.kind === "file") return <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-[#e0e8de] bg-[#fafcf9] p-3 transition-colors hover:border-[#b9d0bd]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e1ebdf] text-[#2a6651]"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#24483d]">{attachment.filename || "Shared file"}</p><p className="mt-0.5 text-[11px] text-[#809488]">Open file in a new tab</p></div><ArrowUpRight size={16} className="text-[#5b8875]" /></a>;
  return <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-[#e0e8de] bg-[#fafcf9] p-3 transition-colors hover:border-[#b9d0bd]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e1ebdf] text-[#2a6651]"><Link2 size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#24483d]">{attachment.filename || attachment.url.replace(/^https?:\/\//, "")}</p><p className="mt-0.5 text-[11px] text-[#809488]">Shared link</p></div><ArrowUpRight size={16} className="text-[#5b8875]" /></a>;
}

function PostCard({ post, onLike, onRepost, onComment, onReport }: { post: FeedPost; onLike: () => void; onRepost: () => void; onComment: () => void; onReport: () => void }) {
  const name = post.author.name || post.author.username || "Circle member";
  return <article className="rounded-[22px] border border-[#dfe6dc] bg-white p-4 shadow-[0_10px_30px_rgba(21,54,43,0.035)] sm:p-5"><div className="flex gap-3"><Avatar initials={getInitials(name)} tone="emerald" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="truncate text-sm font-extrabold text-[#193d33]">{name}</p>{post.author.username && <span className="text-xs text-[#809488]">@{post.author.username}</span>}<span className="text-xs text-[#a4b1a8]">·</span><span className="text-xs text-[#809488]">{new Date(post.createdAt).toLocaleDateString()}</span></div></div><button onClick={onReport} className="grid h-8 w-8 place-items-center rounded-lg text-[#8a9b92] transition-colors hover:bg-[#f9efeb] hover:text-[#a14f36]" aria-label="Report post"><MoreHorizontal size={18} /></button></div><p dir={containsArabic(post.content) ? "rtl" : "auto"} className={`mt-3 whitespace-pre-line text-[14px] leading-6 text-[#38574b] ${containsArabic(post.content) ? "arabic-content" : ""}`}>{post.content}</p>{post.attachments.map((attachment, index) => <AttachmentPreview attachment={attachment} key={attachment.id ?? `${attachment.url}-${index}`} />)}<div className="mt-4 flex items-center justify-between border-t border-[#edf0ea] pt-3"><button onClick={onComment} className="action-button"><MessageCircle size={17} /><span>{post.commentCount || "Reply"}</span></button><button onClick={onRepost} className={`action-button ${post.repostedByViewer ? "text-[#267052]" : ""}`}><Repeat2 size={17} /><span>{post.repostCount || "Repost"}</span></button><button onClick={onLike} className={`action-button ${post.likedByViewer ? "text-[#b75356]" : ""}`}><Heart size={17} fill={post.likedByViewer ? "currentColor" : "none"} /><span>{post.likeCount || "Like"}</span></button><button onClick={() => toast.success("Saved to your private bookmarks.")} className="action-button" aria-label="Bookmark post"><Bookmark size={16} /></button></div></div></div></article>;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [feedMode, setFeedMode] = useState<"following" | "chronological" | "trending">("following");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>(() => (typeof window !== "undefined" ? (localStorage.getItem("ummah-media-filter") as MediaFilter | null) || "all" : "all"));
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>(() => (typeof window !== "undefined" ? (localStorage.getItem("ummah-visibility-filter") as VisibilityFilter | null) || "all" : "all"));
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [reportCategory, setReportCategory] = useState<(typeof reportCategories)[number]>("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [comment, setComment] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const authorName = user?.name || "You";
  const authorInitials = useMemo(() => getInitials(authorName), [authorName]);

  useEffect(() => {
    translateHomeUi();
    const observer = new MutationObserver(() => translateHomeUi());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
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
  const createPost = trpc.social.createPost.useMutation({ onSuccess: async () => { await utils.social.feed.invalidate(); setContent(""); setAttachments([]); setLinkUrl(""); setShowLink(false); setAcknowledged(false); setRulesOpen(false); toast.success("Your post is now part of the circle."); }, onError: error => toast.error(error.message) });
  const upload = trpc.social.uploadAttachment.useMutation({ onError: error => toast.error(error.message) });
  const like = trpc.social.toggleLike.useMutation({ onSuccess: () => utils.social.feed.invalidate(), onError: error => toast.error(error.message) });
  const repost = trpc.social.toggleRepost.useMutation({ onSuccess: () => utils.social.feed.invalidate(), onError: error => toast.error(error.message) });
  const addComment = trpc.social.addComment.useMutation({ onSuccess: () => { utils.social.feed.invalidate(); setComment(""); setCommentOpen(false); toast.success("Your reply has been shared."); }, onError: error => toast.error(error.message) });
  const report = trpc.social.report.useMutation({ onSuccess: () => { setReportOpen(false); setReportDetails(""); toast.success("Report submitted. A moderator will review it fairly."); }, onError: error => toast.error(error.message) });

  const ensureSignedIn = () => {
    if (isAuthenticated) return true;
    toast.info("سجّل الدخول للمشاركة في الدائرة.");
    setLocation("/auth");
    return false;
  };

  const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !ensureSignedIn()) return;
    if (attachments.length >= 5) return toast.error("You can attach up to five items per post.");
    const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("The selected file could not be read.")); reader.readAsDataURL(file); });
    try { const item = await upload.mutateAsync({ filename: file.name, mimeType: file.type || "application/octet-stream", dataBase64: base64 }); setAttachments(current => [...current, item]); toast.success(`${file.name} attached.`); } catch { /* Error toast is handled by the mutation. */ }
  };

  const addLink = () => {
    if (!linkUrl.trim()) return;
    try { new URL(linkUrl.trim()); } catch { return toast.error("Please paste a valid link."); }
    if (attachments.length >= 5) return toast.error("You can attach up to five items per post.");
    setAttachments(current => [...current, { kind: "link", url: linkUrl.trim(), filename: linkUrl.replace(/^https?:\/\//, "") }]); setLinkUrl(""); setShowLink(false);
  };

  const beginSubmission = () => { if (!ensureSignedIn()) return; if (!content.trim()) return toast.error("Write a thoughtful note before sharing."); setRulesOpen(true); };
  const sharePost = () => { if (!acknowledged) return toast.error("Please confirm the community reminder before sharing."); createPost.mutate({ content: content.trim(), visibility: "public", attachments: attachments.map(item => ({ kind: item.kind, url: item.url, storageKey: item.storageKey ?? null, filename: item.filename ?? null, mimeType: item.mimeType ?? null, sizeBytes: item.sizeBytes ?? null })) }); };
  const interact = (postId: number, action: "like" | "repost" | "comment" | "report") => { if (!ensureSignedIn()) return; if (action === "like") like.mutate({ postId }); if (action === "repost") repost.mutate({ postId }); if (action === "comment") { setSelectedPostId(postId); setCommentOpen(true); } if (action === "report") { setSelectedPostId(postId); setReportOpen(true); } };
  const submitComment = () => { if (selectedPostId && comment.trim()) addComment.mutate({ postId: selectedPostId, content: comment.trim() }); };
  const submitReport = () => { if (selectedPostId) report.mutate({ postId: selectedPostId, category: reportCategory, details: reportDetails.trim() || undefined }); };
  const posts = (feedQuery.data ?? []) as FeedPost[];

  return <PlatformShell><div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,680px)_280px] lg:px-8 lg:py-9"><section className="min-w-0"><div className="relative mb-6 overflow-hidden rounded-[25px] border border-[#dbe4d6] bg-[#0e3b31] px-5 py-5 text-[#f5f5ea] shadow-[0_16px_42px_rgba(13,59,49,0.16)] sm:px-6"><div className="geometric-orb" aria-hidden="true" /><div className="relative flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.19em] text-[#e6c96e]">Your mindful feed</p><h1 className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.035em] sm:text-[28px]">As-salamu alaykum, {isAuthenticated ? authorName.split(" ")[0] : "friend"}.</h1><p className="mt-2 max-w-md text-sm leading-5 text-[#cfddd3]">No autoplay. No infinite scroll. Just the people and ideas you choose to receive.</p></div><div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#688777]/60 bg-white/10 text-[#e1c065] sm:grid"><Sparkles size={22} /></div></div></div><div className="mb-5 flex items-center gap-5 border-b border-[#dfe5dc] px-1">{(["following", "chronological", "trending"] as const).map(mode => <button key={mode} onClick={() => setFeedMode(mode)} className={`relative pb-3 text-sm font-bold capitalize transition-colors ${feedMode === mode ? "text-[#12563f]" : "text-[#82958b] hover:text-[#386656]"}`}>{mode === "following" ? "Following" : mode === "chronological" ? "Chronological" : "Trending"}{feedMode === mode && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#bd9941]" />}</button>)}</div>{feedMode === "trending" && <p className="-mt-1 mb-4 px-1 text-[11px] leading-4 text-[#799085]">Trending is an optional, finite view of the day’s most discussed posts. It is never your default feed.</p>}<div className="rounded-[22px] border border-[#dce6dc] bg-white p-4 shadow-[0_10px_28px_rgba(27,66,49,0.035)] sm:p-5"><div className="flex gap-3"><Avatar initials={authorInitials} tone="gold" /><div className="min-w-0 flex-1"><Textarea dir="auto" lang={containsArabic(content) ? "ar" : undefined} value={content} onChange={event => setContent(event.target.value)} placeholder="Share something beneficial with your circle…" className={`min-h-[88px] resize-none border-0 bg-transparent p-0 text-[15px] leading-6 text-[#284b3e] shadow-none placeholder:text-[#9ba9a0] focus-visible:ring-0 ${containsArabic(content) ? "arabic-content" : ""}`} />{attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{attachments.map((attachment, index) => <span key={`${attachment.url}-${index}`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf4ee] py-1.5 pl-2.5 pr-1 text-[11px] font-bold text-[#416d5b]">{attachment.kind === "image" ? <ImagePlus size={13} /> : attachment.kind === "video" ? <Video size={13} /> : attachment.kind === "file" ? <FileText size={13} /> : <Link2 size={13} />}<span className="max-w-32 truncate">{attachment.filename || attachment.kind}</span><button onClick={() => setAttachments(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-md px-1 py-0.5 text-[#6d8f7d] hover:bg-white hover:text-[#a14f36]" aria-label="Remove attachment">×</button></span>)}</div>}{showLink && <div className="mt-3 flex gap-2"><Input value={linkUrl} onChange={event => setLinkUrl(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addLink(); } }} placeholder="https://example.com/resource" className="h-10 rounded-xl border-[#dbe5dc] bg-[#fafcf9] text-xs" /><Button onClick={addLink} type="button" variant="outline" className="h-10 rounded-xl text-xs">Add link</Button></div>}<div className="mt-3 flex items-center justify-between gap-3 border-t border-[#edf1eb] pt-3"><div className="flex items-center gap-1"><input ref={inputRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.txt,.doc,.docx,.xls,.xlsx" onChange={onFileSelect} /><button onClick={() => inputRef.current?.click()} disabled={upload.isPending} className="composer-icon" aria-label="Attach image, video, or file">{upload.isPending ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}</button><button onClick={() => setShowLink(value => !value)} className={`composer-icon ${showLink ? "bg-[#e1eee4] text-[#176147]" : ""}`} aria-label="Add link"><Link2 size={18} /></button></div><Button onClick={beginSubmission} disabled={createPost.isPending || upload.isPending} className="h-9 rounded-xl bg-[#0d4937] px-4 text-xs font-extrabold shadow-none hover:bg-[#176047]"><Send size={15} />Share with adab</Button></div></div></div></div><p className="mt-2 px-2 text-[11px] leading-4 text-[#799085]">Creators can share text, links, images, videos, and files. Arabic harakāt and shaddah are preserved exactly.</p><div className="mt-5 space-y-4">{feedQuery.isLoading ? <div className="flex items-center justify-center rounded-[22px] border border-[#dfe6dc] bg-white py-12 text-sm text-[#6c8579]"><Loader2 className="mr-2 animate-spin" size={18} />Loading your circle…</div> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} onLike={() => interact(post.id, "like")} onRepost={() => interact(post.id, "repost")} onComment={() => interact(post.id, "comment")} onReport={() => interact(post.id, "report")} />) : <div className="rounded-[22px] border border-dashed border-[#c9d9cc] bg-[#fbfcf8] px-6 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#e6f0e5] text-[#276c4e]"><Sparkles size={21} /></span><h2 className="mt-4 font-display text-xl font-semibold text-[#294d40]">A clear space, ready for benefit.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#778d81]">There are no posts in this view yet. Share a useful thought or choose another intentional view.</p></div>}<div className="rounded-[18px] border border-[#e0d5ae] bg-[#f9f3e2] px-5 py-4 text-center"><p className="text-xs font-bold text-[#6d704e]">You are caught up. Step away when you are ready — the circle will still be here.</p></div></div></section><aside className="space-y-5 lg:pt-[104px]"><section className="rounded-[22px] border border-[#dce5da] bg-[#fbfcf8] p-5"><div className="flex items-center gap-2 text-[#1c5844]"><ShieldAlert size={18} /><h2 className="text-sm font-extrabold">The circle standard</h2></div><div className="mt-4 space-y-3">{["Speak truthfully and cite what you share.", "Protect people from scams and manipulation.", "Choose beneficial content over endless distraction.", "Treat Islamic identities with dignity and without bias."].map((rule, index) => <div key={rule} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#e5efe5] text-[10px] font-extrabold text-[#237052]">0{index + 1}</span><p className="text-xs leading-5 text-[#567367]">{rule}</p></div>)}</div></section><section className="rounded-[22px] border border-[#e1d5ad] bg-[#f7f1db] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a6e27]">Today’s intention</p><p className="mt-2 font-display text-lg font-semibold leading-6 text-[#405542]">“Benefit over vanity. Presence over pressure.”</p><p className="mt-3 text-xs leading-5 text-[#71816c]">Use your feed with intention: learn, contribute, and reconnect.</p></section></aside></div><Dialog open={rulesOpen} onOpenChange={setRulesOpen}><DialogContent className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><span className="mb-2 grid h-11 w-11 place-items-center rounded-2xl bg-[#e4efdf] text-[#176147]"><ShieldAlert size={21} /></span><DialogTitle className="font-display text-2xl tracking-[-0.035em] text-[#174035]">Share with adab</DialogTitle><DialogDescription className="pt-1 leading-6 text-[#688075]">A quick reminder at the point of submission: your words should be truthful, useful, and respectful.</DialogDescription></DialogHeader><div className="rounded-xl border border-[#dfe9de] bg-white p-4 text-xs leading-5 text-[#547468]">By sharing, you confirm that this post does not contain a <strong>scam</strong>, a <strong>lie</strong>, <strong>brainrot</strong>, or <strong>haram imagery</strong>, and that it respects fellow Muslims without bias.</div><label className="mt-1 flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2 text-sm font-semibold text-[#315447]"><Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} className="mt-0.5 border-[#8eaa9a] data-[state=checked]:bg-[#176047]" />I understand and agree to the community rules.</label><DialogFooter className="mt-2"><Button variant="outline" onClick={() => setRulesOpen(false)} className="rounded-xl">Go back</Button><Button onClick={sharePost} disabled={createPost.isPending} className="rounded-xl bg-[#0d4937] hover:bg-[#176047]">Confirm & share</Button></DialogFooter></DialogContent></Dialog><Dialog open={commentOpen} onOpenChange={setCommentOpen}><DialogContent className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><DialogTitle className="font-display text-2xl tracking-[-0.035em] text-[#174035]">Reply with care</DialogTitle><DialogDescription className="pt-1 leading-6 text-[#688075]">Add something true, useful, and respectful to the discussion.</DialogDescription></DialogHeader><Textarea dir="auto" lang={containsArabic(comment) ? "ar" : undefined} value={comment} onChange={event => setComment(event.target.value)} placeholder="Write a thoughtful reply…" className={`min-h-28 rounded-xl border-[#dce6dc] ${containsArabic(comment) ? "arabic-content" : ""}`} /><DialogFooter><Button variant="outline" onClick={() => setCommentOpen(false)} className="rounded-xl">Cancel</Button><Button onClick={submitComment} disabled={!comment.trim() || addComment.isPending} className="rounded-xl bg-[#0d4937] hover:bg-[#176047]">Reply</Button></DialogFooter></DialogContent></Dialog><Dialog open={reportOpen} onOpenChange={setReportOpen}><DialogContent className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><DialogTitle className="font-display text-2xl tracking-[-0.035em] text-[#174035]">Report with care</DialogTitle><DialogDescription className="pt-1 leading-6 text-[#688075]">Choose the clearest category. Reports are sent to moderators for review, not public shaming.</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-2">{reportCategories.map(category => <button key={category} onClick={() => setReportCategory(category)} className={`rounded-xl border px-3 py-3 text-left text-xs font-bold capitalize transition-colors ${reportCategory === category ? "border-[#31765a] bg-[#e5f0e6] text-[#155a40]" : "border-[#dce4dc] bg-white text-[#617b70] hover:border-[#a6bfae]"}`}>{category}</button>)}</div><Textarea value={reportDetails} onChange={event => setReportDetails(event.target.value)} placeholder="Optional context for moderators" className="min-h-20 rounded-xl border-[#dce6dc] text-sm" /><DialogFooter className="mt-2"><Button variant="outline" onClick={() => setReportOpen(false)} className="rounded-xl">Cancel</Button><Button onClick={submitReport} disabled={report.isPending} className="rounded-xl bg-[#a4563d] hover:bg-[#8f452f]">Submit report</Button></DialogFooter></DialogContent></Dialog></PlatformShell>;
}
