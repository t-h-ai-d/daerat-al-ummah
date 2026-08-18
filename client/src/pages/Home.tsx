import { useAuth } from "@/_core/hooks/useAuth";
import AttachmentActions from "@/components/AttachmentActions";
import EmojiPicker from "@/components/EmojiPicker";
import PlatformShell from "@/components/PlatformShell";
import PostComments from "@/components/PostComments";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ownerReviewMailto } from "@/lib/ownerReview";
import { uploadAttachmentSafely } from "@/lib/attachmentUpload";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Bookmark, Eye, FileText, Flag, Heart, ImageIcon, Link2, Loader2, MoreHorizontal, Palette, Pencil, Repeat2, Send, ShieldAlert, Sparkles, Tag, Trash2, Upload, UsersRound, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Attachment = {
  id?: number;
  kind: "image" | "gif" | "video" | "file" | "link";
  url: string;
  storageKey?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  scanStatus?: "pending" | "clean" | "blocked";
};

type FeedPost = {
  id: number;
  author: { id: number; name: string | null; username: string | null; avatarUrl: string | null };
  title?: string | null;
  content: string;
  hashtags?: string | null;
  textStyle?: "default" | "serif" | "emphasis";
  visibility: "public" | "friends";
  createdAt: Date;
  attachments: Attachment[];
  likeCount: number;
  commentCount: number;
  repostCount: number;
  likedByViewer: boolean;
  repostedByViewer: boolean;
};

type ComposerKind = "text" | "images" | "video" | "files" | "mixed";
type FeedMode = "following" | "chronological" | "balanced";
type MediaFilter = "all" | Attachment["kind"];
type VisibilityFilter = "all" | "public";

const MAX_ATTACHMENT_BYTES = 1_073_741_824;
const containsArabic = (value: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);
const isAudioOrVideo = (mimeType?: string | null) => Boolean(mimeType?.toLowerCase().startsWith("audio/") || mimeType?.toLowerCase().startsWith("video/"));
const composerKinds: Array<{ id: ComposerKind; label: string; detail: string; icon: typeof FileText; accept: string }> = [
  { id: "text", label: "نَصّ", detail: "فكرة أو مقال", icon: FileText, accept: "" },
  { id: "images", label: "صُوَر", detail: "صورة أو GIF", icon: ImageIcon, accept: "image/*" },
  { id: "video", label: "فِيدْيُو", detail: "فيديو أو صوت واحد", icon: Video, accept: "video/*,audio/*" },
  { id: "files", label: "مَلَفّات", detail: "وثائق وملفات", icon: Upload, accept: "*/*" },
  { id: "mixed", label: "مُتَنَوِّع", detail: "نصّ ووسائط", icon: Sparkles, accept: "*/*" },
];

function Avatar({ initials, tone = "emerald" }: { initials: string; tone?: "emerald" | "gold" }) {
  const palette = tone === "gold" ? "bg-[#f2e5b9] text-[#805f14]" : "bg-[#dcece1] text-[#176047]";
  return <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[15px] text-xs font-extrabold ${palette}`}>{initials}</span>;
}

function initials(value?: string | null) {
  return (value || "د").split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (attachment.scanStatus && attachment.scanStatus !== "clean") {
    const blocked = attachment.scanStatus === "blocked";
    return <div className="mt-4 flex gap-3 rounded-xl border border-[#ead7a3] bg-[#fffaf0] p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f5e7c4] text-[#896c1f]"><ShieldAlert size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#6f5415]">{attachment.filename || "مَلَفٌّ مُرْفَق"}</p><p className="mt-0.5 text-[11px] text-[#896c1f]">{blocked ? "حُظِرَ هذا الملف بعد الفحص الأمني." : "المَلَفُّ في الحَجْرِ الأَمْنِيِّ حتّى يكتمل الفحص."}</p></div><span className="rounded-full bg-[#f5e7c4] px-2.5 py-1 text-[10px] font-extrabold text-[#795c16]">{blocked ? "مَحْظُور" : "قَيْدَ الفَحْص"}</span></div>;
  }
  if (attachment.kind === "image" || attachment.kind === "gif") {
    return <div className="relative mt-4"><img src={attachment.url} alt={attachment.filename || "صُورَةٌ مُرْفَقَة"} className="max-h-[440px] w-full rounded-2xl border border-[#e0e8de] object-cover" /><span className="absolute right-3 top-3 rounded-full bg-[#163e33]/90 px-2.5 py-1 text-[10px] font-extrabold text-white">{attachment.kind === "gif" ? "GIF مُتَحَرِّك" : "صُورَة"}</span><AttachmentActions attachment={attachment} /></div>;
  }
  if (attachment.kind === "video") {
    return <div className="relative mt-4"><video controls preload="metadata" className="max-h-[440px] w-full rounded-2xl border border-[#e0e8de] bg-[#183b32]"><source src={attachment.url} type={attachment.mimeType || "video/mp4"} />لا يدعم متصفّحك تشغيل هذا الفيديو.</video><span className="absolute right-3 top-3 rounded-full bg-[#163e33]/90 px-2.5 py-1 text-[10px] font-extrabold text-white">فِيدْيُو</span><AttachmentActions attachment={attachment} /></div>;
  }
  if (attachment.kind === "file") {
    return <div className="mt-4 rounded-xl border border-[#e0e8de] bg-[#fafcf9] p-3"><a href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 transition-colors hover:text-[#176047]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e1ebdf] text-[#2a6651]"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#24483d]">{attachment.filename || "مَلَفٌّ مُرْفَق"}</p><p className="mt-0.5 text-[11px] text-[#809488]">مَلَفٌّ آمِن</p></div><ArrowUpRight size={16} className="text-[#5b8875]" /></a><AttachmentActions attachment={attachment} /></div>;
  }
  return <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-[#e0e8de] bg-[#fafcf9] p-3 hover:border-[#b9d0bd]"><Link2 size={17} className="text-[#2a6651]" /><span className="min-w-0 flex-1 truncate text-xs font-bold text-[#24483d]">{attachment.filename || attachment.url}</span><ArrowUpRight size={16} className="text-[#5b8875]" /></a>;
}

function PostCard({ post, isAuthor, onLike, onRepost, onReport, onDelete, onEdit, onSetVisibility }: { post: FeedPost; isAuthor: boolean; onLike: () => void; onRepost: () => void; onReport: () => void; onDelete: () => void; onEdit: () => void; onSetVisibility: (visibility: "public" | "friends") => void }) {
  const name = post.author.name || post.author.username || "عُضْوٌ في الدَّائِرَة";
  const style = post.textStyle === "serif" ? "font-display" : post.textStyle === "emphasis" ? "font-bold" : "";
  return <article className="rounded-[22px] border border-[#dfe6dc] bg-white p-4 shadow-[0_10px_30px_rgba(21,54,43,0.035)] sm:p-5"><div className="flex gap-3"><Avatar initials={initials(name)} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="truncate text-sm font-extrabold text-[#193d33]">{name}</p>{post.author.username && <span className="text-xs text-[#809488]">@{post.author.username}</span>}<span className="text-xs text-[#809488]">{new Date(post.createdAt).toLocaleDateString("ar-SA")}</span></div></div><DropdownMenu><DropdownMenuTrigger asChild><button className="grid h-8 w-8 place-items-center rounded-lg text-[#698478] hover:bg-[#edf4ee] hover:text-[#176047]" aria-label="خِيَارَاتُ المَنْشُور"><MoreHorizontal size={18} /></button></DropdownMenuTrigger><DropdownMenuContent align="end" dir="rtl" className="min-w-48 border-[#dbe5dc] bg-[#fbfcf8] text-[#284b3e]">{isAuthor ? <><DropdownMenuLabel>خِيَارَاتُ مَنْشُورِكَ</DropdownMenuLabel><DropdownMenuItem onSelect={onEdit}><Pencil />تَحْرِير</DropdownMenuItem><DropdownMenuItem onSelect={() => onSetVisibility("public")} disabled={post.visibility === "public"}><Eye />لِلْعَامَّة</DropdownMenuItem><DropdownMenuItem onSelect={() => onSetVisibility("friends")} disabled={post.visibility === "friends"}><UsersRound />لِلْأَصْدِقَاءِ فَقَط</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 />حَذْفُ المَنْشُور</DropdownMenuItem></> : <><DropdownMenuLabel>خِيَارَاتُ المَنْشُور</DropdownMenuLabel><DropdownMenuItem onSelect={onReport}><Flag />إِبْلاغ</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></div>{post.title && <h2 className="mt-3 font-display text-lg font-semibold text-[#193d33]">{post.title}</h2>}{post.content && <p dir={containsArabic(post.content) ? "rtl" : "auto"} className={`mt-3 whitespace-pre-line text-[14px] leading-7 text-[#38574b] ${style} ${containsArabic(post.content) ? "arabic-content" : ""}`}>{post.content}</p>}{post.hashtags && <div className="mt-3 flex flex-wrap gap-2" dir="rtl">{post.hashtags.split(/\s+/).filter(Boolean).map(tag => <span key={tag} className="inline-flex items-center rounded-full bg-[#edf5ec] px-2.5 py-1 text-xs font-bold text-[#267052]">{tag}</span>)}</div>}{post.attachments.map((attachment, index) => <AttachmentPreview key={attachment.id ?? `${attachment.url}-${index}`} attachment={attachment} />)}<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0ea] pt-3"><PostComments postId={post.id} commentCount={post.commentCount} /><div className="flex flex-wrap gap-3"><button onClick={onRepost} className={`action-button ${post.repostedByViewer ? "text-[#267052]" : ""}`}><Repeat2 size={17} /><span>{post.repostCount || "إِعَادَةُ نَشْر"}</span></button><button onClick={onLike} className={`action-button ${post.likedByViewer ? "text-[#b75356]" : ""}`}><Heart size={17} fill={post.likedByViewer ? "currentColor" : "none"} /><span>{post.likeCount || "إِعْجَاب"}</span></button>{!isAuthor && <button onClick={onReport} className="action-button text-[#a64b41]"><Flag size={16} /><span>إِبْلاغ</span></button>}<button onClick={() => toast.success("حُفِظَ في إشاراتك الخاصّة.")} className="action-button" aria-label="حِفْظُ المَنْشُور"><Bookmark size={16} /></button></div></div></div></div></article>;
}

function CircleGuidance() {
  return <aside className="space-y-4 lg:pt-[104px]"><section className="rounded-[22px] border border-[#dce5da] bg-[#fbfcf8] p-5"><div className="flex items-center gap-2 text-[#1c5844]"><ShieldAlert size={18} /><h2 className="text-sm font-extrabold">مِعْيَارُ الدَّائِرَة</h2></div><div className="mt-4 space-y-3">{["تكلَّم بصدقٍ وتثبَّت ممّا تشارك.", "احْمِ الناس من الاحتيال والتلاعب.", "اخْتَر المحتوى النّافع بدل التشتيت المتواصل.", "عامِل المسلمين بكرامةٍ ومن دون تحيّز."].map((rule, index) => <div key={rule} className="flex gap-3"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#e5efe5] text-[10px] font-extrabold text-[#237052]">0{index + 1}</span><p className="text-xs leading-5 text-[#567367]">{rule}</p></div>)}</div></section><section className="rounded-[22px] border border-[#e1d5ad] bg-[#f7f1db] p-5"><p className="text-[10px] font-bold tracking-[0.18em] text-[#8a6e27]">نِيَّةُ اليَوْم</p><p className="mt-2 font-display text-lg font-semibold leading-6 text-[#405542]">«النَّفْعُ قبلَ المَظاهِر، والحُضورُ بلا ضَغْط.»</p></section></aside>;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedMode, setFeedMode] = useState<FeedMode>("following");
  const [mediaFilter] = useState<MediaFilter>(() => (typeof window === "undefined" ? "all" : (localStorage.getItem("ummah-media-filter") as MediaFilter | null) || "all"));
  const [visibilityFilter] = useState<VisibilityFilter>(() => (typeof window === "undefined" ? "all" : (localStorage.getItem("ummah-visibility-filter") as VisibilityFilter | null) || "all"));
  const [kind, setKind] = useState<ComposerKind>("mixed");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [textStyle, setTextStyle] = useState<"default" | "serif" | "emphasis">("default");
  const [visibility, setVisibility] = useState<"public" | "friends">("public");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [reportPost, setReportPost] = useState<FeedPost | null>(null);
  const [reportCategory, setReportCategory] = useState<"scam" | "lie" | "brainrot" | "haram imagery">("scam");
  const [reportDetails, setReportDetails] = useState("");
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const authorName = user?.name || user?.username || "عُضْو";
  const currentKind = composerKinds.find(option => option.id === kind) ?? composerKinds[4];
  const feedQuery = trpc.social.feed.useQuery({ mode: feedMode, ...(mediaFilter === "all" ? {} : { mediaType: mediaFilter }), ...(visibilityFilter === "all" ? {} : { visibilityScope: visibilityFilter }) });

  const createPost = trpc.social.createPost.useMutation({
    onSuccess: async result => {
      await Promise.all([utils.social.feed.invalidate(), utils.social.myPosts.invalidate()]);
      setTitle(""); setContent(""); setAttachments([]); setShowLink(false); setLinkUrl(""); setAcknowledged(false); setRulesOpen(false);
      if (result.moderation.status === "under_review") toast.message(result.moderation.message, { duration: 10_000, action: { label: "مُراسَلَةُ المَالِك", onClick: () => { window.location.href = ownerReviewMailto(result.postId); } } });
      else toast.success("نُشِرَ محتواك في الدَّائِرَة.");
    },
    onError: error => toast.error(error.message),
  });
  const prepareAttachmentUpload = trpc.social.prepareAttachmentUpload.useMutation();
  const discardAttachmentUpload = trpc.social.discardAttachmentUpload.useMutation();
  const like = trpc.social.toggleLike.useMutation({ onSuccess: () => utils.social.feed.invalidate(), onError: error => toast.error(error.message) });
  const repost = trpc.social.toggleRepost.useMutation({ onSuccess: () => utils.social.feed.invalidate(), onError: error => toast.error(error.message) });
  const deletePost = trpc.social.deletePost.useMutation({ onSuccess: () => { void utils.social.feed.invalidate(); toast.success("حُذِفَ مَنْشُورُكَ."); }, onError: error => toast.error(error.message) });
  const updatePost = trpc.social.updatePost.useMutation({ onError: error => toast.error(error.message) });
  const submitReport = trpc.social.submitReport.useMutation({ onSuccess: () => { setReportPost(null); setReportDetails(""); toast.success("أُرْسِلَ الإِبْلاغُ إلى مالك المنصّة."); }, onError: error => toast.error(error.message) });

  useEffect(() => {
    const sync = () => window.dispatchEvent(new Event("ummah-media-filter"));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const ensureSignedIn = () => {
    if (isAuthenticated) return true;
    toast.info("سَجِّلِ الدُّخولَ للمشاركة في الدَّائِرَة.");
    setLocation("/auth");
    return false;
  };

  const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || !ensureSignedIn()) return;
    const accepted: File[] = [];
    let hasAudioOrVideo = attachments.some(attachment => isAudioOrVideo(attachment.mimeType));
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) { toast.error(`تجاوز «${file.name}» الحدَّ المشترك: 1 غيغابايت.`); continue; }
      if (isAudioOrVideo(file.type)) {
        if (hasAudioOrVideo) { toast.error(`لم يُضَف «${file.name}»: يُسمَح بفيديو أو صوت واحد فقط.`); continue; }
        hasAudioOrVideo = true;
      }
      accepted.push(file);
    }
    if (!accepted.length) return;
    setIsAttachmentUploading(true);
    try {
      for (const file of accepted) {
        const attachment = await uploadAttachmentSafely(file, input => prepareAttachmentUpload.mutateAsync(input));
        setAttachments(current => [...current, attachment]);
        if (attachment.scanStatus === "pending") toast.message("رُفِعَ الملف إلى الحَجْر الأمني؛ لن يُفتَح قبل اكتمال الفحص.");
      }
      toast.success(`أُضيف ${accepted.length} مرفق/مرفّقات. يمكنك حذف أيٍّ منها قبل النشر.`);
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "تعذّر إكمال رفع المرفق الآن.");
    } finally { setIsAttachmentUploading(false); }
  };

  const removeSelectedAttachment = async (attachment: Attachment, index: number) => {
    if (attachment.storageKey) {
      try { await discardAttachmentUpload.mutateAsync({ storageKey: attachment.storageKey }); }
      catch { toast.error("تعذّر حذف الملف من التخزين الآن."); return; }
    }
    setAttachments(current => current.filter((_, itemIndex) => itemIndex !== index));
    toast.success("حُذِفَ المرفق قبل النشر.");
  };

  const addLink = () => {
    try {
      const parsed = new URL(linkUrl.trim());
      if (!/^https?:$/.test(parsed.protocol)) throw new Error();
      setAttachments(current => [...current, { kind: "link", url: parsed.toString(), filename: parsed.host }]);
      setLinkUrl(""); setShowLink(false);
    } catch { toast.error("اِلصَق رابطًا يبدأ بـ https:// أو http://."); }
  };
  const beginSubmission = () => {
    if (!ensureSignedIn()) return;
    if (!content.trim() && !attachments.length) return toast.error("اكتب نصًّا، أو أضف مرفقًا واحدًا على الأقل.");
    setRulesOpen(true);
  };
  const sharePost = () => {
    if (!acknowledged) return toast.error("أكِّد تذكير قواعد الدَّائِرَة قبل النشر.");
    createPost.mutate({ title: title.trim() || undefined, content: content.trim(), textStyle, visibility, attachments: attachments.map(item => ({ kind: item.kind, url: item.url, storageKey: item.storageKey ?? null, filename: item.filename ?? null, mimeType: item.mimeType ?? null, sizeBytes: item.sizeBytes ?? null })) });
  };
  const posts = (feedQuery.data ?? []) as FeedPost[];
  const isLoading = feedQuery.isLoading;
  const shouldShowEmpty = !isLoading && (!posts.length || feedQuery.isError);

  return <PlatformShell><main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9"><div className="grid gap-8 lg:grid-cols-[minmax(0,680px)_280px]"><section className="min-w-0"><section className="relative mb-6 overflow-hidden rounded-[26px] border border-[#dbe4d6] bg-[#0e3b31] px-5 py-6 text-[#f5f5ea] shadow-[0_16px_42px_rgba(13,59,49,0.16)] sm:px-7"><div className="geometric-orb" aria-hidden="true" /><div className="relative flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.19em] text-[#e6c96e]">خُلاصَتُكَ الهَادِئَة</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">السَّلامُ عَلَيْكُم، {isAuthenticated ? authorName.split(" ")[0] : "صَدِيقَ الدَّائِرَة"}.</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#cfddd3]">لا تَشْغيلَ تلقائيًّا، ولا تمريرًا بلا نهاية. أنت تختار ما تكتبه وما تتابعه.</p></div><Sparkles className="hidden text-[#e1c065] sm:block" size={28} /></div></section><div className="mb-5 flex gap-5 overflow-x-auto border-b border-[#dfe5dc] px-1">{(["following", "chronological", "balanced"] as const).map(mode => <button key={mode} onClick={() => setFeedMode(mode)} className={`relative shrink-0 pb-3 text-sm font-bold ${feedMode === mode ? "text-[#12563f]" : "text-[#82958b]"}`}>{mode === "following" ? "المُتابَعون" : mode === "chronological" ? "الأَحْدَث" : "مُوازَن"}{feedMode === mode && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#bd9941]" />}</button>)}</div><section className="rounded-[24px] border border-[#dce6dc] bg-white p-4 shadow-[0_10px_28px_rgba(27,66,49,0.035)] sm:p-5"><div className="flex gap-3"><Avatar initials={initials(authorName)} tone="gold" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-semibold text-[#24483d]">أَنْشِئْ مَنْشُورًا</h2><p className="mt-1 text-xs text-[#789084]">اختر النوع، ثم أضف ما يناسبك؛ النصّ اختياريّ عند إرفاق وسائط.</p></div><span className="rounded-full bg-[#eff5ed] px-2.5 py-1 text-[10px] font-extrabold text-[#2a6651]">مَسَاحَةُ المُنْشِئ</span></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{composerKinds.map(option => { const Icon = option.icon; const active = kind === option.id; return <button key={option.id} type="button" onClick={() => setKind(option.id)} className={`rounded-xl border p-2 text-right transition-colors ${active ? "border-[#0f513c] bg-[#eaf3e9] text-[#15513d]" : "border-[#e0e8df] bg-[#fbfcfa] text-[#627c70] hover:border-[#b9d0bd]"}`}><Icon size={15} /><span className="mt-1.5 block text-[11px] font-extrabold">{option.label}</span><span className="mt-0.5 block text-[9px] leading-3 opacity-80">{option.detail}</span></button>; })}</div><div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><Input value={title} onChange={event => setTitle(event.target.value)} maxLength={240} placeholder="عُنْوانٌ اختياريّ" className="h-10 rounded-xl border-[#dbe5dc] bg-[#fafcf9] text-right text-sm" /><div className="flex rounded-xl border border-[#dbe5dc] bg-[#fafcf9] p-1"><button type="button" onClick={() => setTextStyle("default")} className={`rounded-lg px-2 text-xs ${textStyle === "default" ? "bg-white text-[#176047] shadow-sm" : "text-[#809488]"}`}>عادي</button><button type="button" onClick={() => setTextStyle("serif")} className={`rounded-lg px-2 text-xs ${textStyle === "serif" ? "bg-white text-[#176047] shadow-sm" : "text-[#809488]"}`}>أَدَبِيّ</button><button type="button" onClick={() => setTextStyle("emphasis")} className={`rounded-lg px-2 text-xs ${textStyle === "emphasis" ? "bg-white text-[#176047] shadow-sm" : "text-[#809488]"}`}>بارز</button></div><button type="button" onClick={() => setVisibility(current => current === "public" ? "friends" : "public")} className="rounded-xl border border-[#dbe5dc] bg-[#fafcf9] px-3 text-xs font-bold text-[#567367]">{visibility === "public" ? "لِلْعَامَّة" : "لِلْأَصْدِقَاء"}</button></div><Textarea dir="auto" lang={containsArabic(content) ? "ar" : undefined} value={content} onChange={event => setContent(event.target.value)} maxLength={5000} placeholder={kind === "text" ? "اكتب فكرتك أو مقالك…" : "أضف شرحًا أو اترك النص فارغًا وانشر المرفق…"} className={`mt-3 min-h-[112px] resize-none rounded-xl border-[#dce6dc] bg-[#fdfefd] text-[15px] leading-7 text-[#284b3e] ${textStyle === "serif" ? "font-display" : textStyle === "emphasis" ? "font-bold" : ""} ${containsArabic(content) ? "arabic-content" : ""}`} /><div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#738a7f]"><Tag size={14} /><span>أضف وسمًا داخل النص مثل <bdi dir="ltr">#علم</bdi> أو <bdi dir="ltr">#technology</bdi>.</span></div>{attachments.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{attachments.map((attachment, index) => <span key={`${attachment.url}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#edf4ee] py-1.5 pl-2.5 pr-1 text-[11px] font-bold text-[#416d5b]">{attachment.kind === "image" || attachment.kind === "gif" ? <ImageIcon size={13} /> : isAudioOrVideo(attachment.mimeType) ? <Video size={13} /> : attachment.kind === "file" ? <FileText size={13} /> : <Link2 size={13} />}<span className="max-w-32 truncate">{attachment.filename || attachment.kind}</span><button type="button" onClick={() => void removeSelectedAttachment(attachment, index)} className="rounded-md px-1 text-[#6d8f7d] hover:bg-white hover:text-[#a14f36]" aria-label={`حَذْفُ ${attachment.filename || "المرفق"}`}>×</button></span>)}</div>}{showLink && <div className="mt-3 flex gap-2"><Input dir="ltr" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addLink(); } }} placeholder="https://example.com" className="h-10 rounded-xl border-[#dbe5dc] bg-[#fafcf9] text-left text-xs" /><Button onClick={addLink} type="button" variant="outline" className="h-10 rounded-xl text-xs">إِضافَةُ رابِط</Button></div>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1eb] pt-3"><div className="flex items-center gap-1"><input ref={fileInputRef} type="file" className="hidden" accept={currentKind.accept} multiple={kind !== "video"} onChange={onFileSelect} /><button type="button" onClick={() => fileInputRef.current?.click()} disabled={kind === "text" || isAttachmentUploading} className="composer-icon" aria-label="إرْفاقُ مَلَفّات">{isAttachmentUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}</button><EmojiPicker onSelect={emoji => setContent(current => `${current}${current ? " " : ""}${emoji}`)} disabled={isAttachmentUploading} className="h-9 w-9 rounded-xl text-[#467566] hover:bg-[#e8f1e7] hover:text-[#176047]" /><button type="button" onClick={() => setShowLink(value => !value)} className={`composer-icon ${showLink ? "bg-[#e1eee4] text-[#176147]" : ""}`} aria-label="إِضافَةُ رابِط"><Link2 size={18} /></button><Palette size={16} className="mr-1 text-[#8aa296]" /></div><Button onClick={beginSubmission} disabled={createPost.isPending || isAttachmentUploading} className="h-10 rounded-xl bg-[#0d4937] px-5 text-xs font-extrabold hover:bg-[#176047]"><Send size={15} />اُنْشُرْ بِأَدَب</Button></div></div></div><p className="mt-3 px-2 text-[11px] leading-5 text-[#799085]">يمكنك نشر: نصّ، فيديو، صورة، ملف، أو أيّ مزجٍ بينها. أضِف ما تشاء من الصور والملفات؛ يُسمح بفيديو أو ملفّ صوتي واحد فقط، وحدُّ كلِّ مرفق 1 غيغابايت.</p></section><div className="mt-5 space-y-4">{isLoading ? <div className="feed-loader rounded-[22px] border border-[#dfe6dc] bg-white py-12 text-sm text-[#6c8579]"><span className="feed-loader__dot" /><span>يَجْرِي تَجْهِيزُ الخُلاصَةِ…</span></div> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} isAuthor={post.author.id === user?.id} onLike={() => { if (ensureSignedIn()) like.mutate({ postId: post.id }); }} onRepost={() => { if (ensureSignedIn()) repost.mutate({ postId: post.id }); }} onReport={() => { if (ensureSignedIn()) setReportPost(post); }} onDelete={() => { if (window.confirm("هل تريد حذف منشورك نهائيًّا؟")) deletePost.mutate({ postId: post.id }); }} onEdit={() => { setEditingPost(post); setEditedContent(post.content); }} onSetVisibility={nextVisibility => updatePost.mutate({ postId: post.id, visibility: nextVisibility }, { onSuccess: () => { void utils.social.feed.invalidate(); toast.success("حُدِّثَت خُصوصِيَّةُ المَنْشُور."); } })} />) : shouldShowEmpty ? <div className="feed-empty rounded-[22px] border border-dashed border-[#c9d9cc] bg-[#fbfcf8] px-6 py-12 text-center"><Sparkles className="mx-auto text-[#276c4e]" size={24} /><h2 className="mt-4 font-display text-xl font-semibold text-[#294d40]">الدَّائِرَةُ فارِغَةٌ</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#778d81]">لا توجد منشورات هنا الآن. شارك فكرةً نافعة عندما تشاء.</p></div> : null}<div className="rounded-[18px] border border-[#e0d5ae] bg-[#f9f3e2] px-5 py-4 text-center"><p className="text-xs font-bold text-[#6d704e]">وَصَلْتَ إلى نِهَايَةِ الخُلاصَة. خُذْ وَقْتَكَ؛ الدَّائِرَةُ سَتَبْقَى هُنا.</p></div></div></section><div className="hidden lg:block"><CircleGuidance /></div></div><Dialog open={rulesOpen} onOpenChange={setRulesOpen}><DialogContent dir="rtl" className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><DialogTitle className="font-display text-2xl text-[#174035]">انْشُرْ بِأَدَب</DialogTitle><DialogDescription className="leading-6 text-[#688075]">تذكيرٌ سريع: اجعل كلماتك صادقةً ونافعةً ومحترمةً.</DialogDescription></DialogHeader><div className="rounded-xl border border-[#dfe9de] bg-white p-4 text-xs leading-5 text-[#547468]">بنشر هذا المحتوى، تؤكّد أنّه لا يتضمّن احتيالًا أو كذبًا أو محتوىً مفسدًا للعقل أو صورًا محرَّمة.</div><label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-2 text-sm font-semibold text-[#315447]"><Checkbox checked={acknowledged} onCheckedChange={checked => setAcknowledged(checked === true)} className="mt-0.5 border-[#8eaa9a] data-[state=checked]:bg-[#176047]" />أَفْهَمُ قواعِدَ الدَّائِرَةِ وأُوافِقُ عَلَيْها.</label><DialogFooter><Button variant="outline" onClick={() => setRulesOpen(false)} className="rounded-xl">رُجوع</Button><Button onClick={sharePost} disabled={createPost.isPending} className="rounded-xl bg-[#0d4937] hover:bg-[#176047]">تَأْكِيدُ النَّشْر</Button></DialogFooter></DialogContent></Dialog><Dialog open={Boolean(reportPost)} onOpenChange={open => { if (!open) setReportPost(null); }}><DialogContent dir="rtl" className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><DialogTitle className="font-display text-2xl text-[#174035]">الإِبْلاغُ عَنْ مَنْشُور</DialogTitle><DialogDescription>يُرسَل البلاغ من الخادم إلى مالك المنصّة، ولا يُفتَح بريدك الشخصي.</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-2">{([ ["scam", "احْتِيال"], ["lie", "كَذِب"], ["brainrot", "مُفْسِدٌ لِلْعَقْل"], ["haram imagery", "صُوَرٌ مُحَرَّمَة"] ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setReportCategory(value)} className={`rounded-xl border px-3 py-2 text-right text-xs font-bold ${reportCategory === value ? "border-[#b6794d] bg-[#fbf0e9] text-[#914a31]" : "border-[#dce6dc] bg-white text-[#547468]"}`}>{label}</button>)}</div><Textarea value={reportDetails} onChange={event => setReportDetails(event.target.value)} maxLength={2000} placeholder="تَفاصيلُ مختصرةٌ (اختياري)" className="min-h-28 rounded-xl border-[#dce6dc]" /><DialogFooter><Button variant="outline" onClick={() => setReportPost(null)} className="rounded-xl">إِلغاء</Button><Button onClick={() => reportPost && submitReport.mutate({ postId: reportPost.id, category: reportCategory, ...(reportDetails.trim() ? { details: reportDetails.trim() } : {}) })} disabled={submitReport.isPending} className="rounded-xl bg-[#a14f36] hover:bg-[#8d422c]">إِرْسالُ الإِبْلاغ</Button></DialogFooter></DialogContent></Dialog><Dialog open={Boolean(editingPost)} onOpenChange={open => { if (!open) setEditingPost(null); }}><DialogContent dir="rtl" className="max-w-md rounded-[24px] border-[#dbe5dc] bg-[#fbfcf8] p-6"><DialogHeader><DialogTitle className="font-display text-2xl text-[#174035]">تَحْريرُ المَنْشُور</DialogTitle><DialogDescription>عدِّل كلامك مع الحفاظ على قواعد الدَّائِرَة.</DialogDescription></DialogHeader><Textarea value={editedContent} onChange={event => setEditedContent(event.target.value)} className="min-h-36 rounded-xl border-[#dce6dc]" maxLength={5000} /><DialogFooter><Button variant="outline" onClick={() => setEditingPost(null)} className="rounded-xl">إِلغاء</Button><Button onClick={() => editingPost && updatePost.mutate({ postId: editingPost.id, content: editedContent.trim() }, { onSuccess: () => { void utils.social.feed.invalidate(); setEditingPost(null); toast.success("حُدِّثَ مَنْشُورُكَ."); } })} disabled={updatePost.isPending || !editedContent.trim()} className="rounded-xl bg-[#0d4937] hover:bg-[#176047]">حِفْظُ التَّعْديل</Button></DialogFooter></DialogContent></Dialog></main></PlatformShell>;
}
