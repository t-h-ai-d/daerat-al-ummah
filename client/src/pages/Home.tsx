import { useAuth } from "@/_core/hooks/useAuth";
import AttachmentActions from "@/components/AttachmentActions";
import PlatformShell from "@/components/PlatformShell";
import PostComments from "@/components/PostComments";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Bookmark, FileText, Flag, Heart, ImageIcon, Link2, Loader2, MoreHorizontal, Palette, Pencil, Repeat2, ShieldAlert, Sparkles, Trash2, UsersRound, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export type Attachment = {
  id?: number;
  kind: "image" | "gif" | "video" | "file" | "link";
  url: string;
  storageKey?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  scanStatus?: "pending" | "clean" | "blocked";
};

export type FeedPost = {
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
  savedByViewer: boolean;
};

type FeedMode = "following" | "chronological" | "balanced";

const containsArabic = (value: string) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value);
const initials = (value?: string | null) => (value || "د").split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

function Avatar({ name }: { name?: string | null }) {
  return <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] bg-[#dcece1] text-xs font-extrabold text-[#176047]">{initials(name)}</span>;
}

export function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (attachment.scanStatus && attachment.scanStatus !== "clean") {
    return <div className="mt-4 flex gap-3 rounded-xl border border-[#ead7a3] bg-[#fffaf0] p-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f5e7c4] text-[#896c1f]"><ShieldAlert size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#6f5415]">{attachment.filename || "مَلَفٌّ مُرْفَق"}</p><p className="mt-0.5 text-[11px] text-[#896c1f]">{attachment.scanStatus === "blocked" ? "حُظِرَ هذا الملف بعد الفحص الأمني." : "المَلَفُّ في الحَجْرِ الأَمْنِيِّ حتّى يكتمل الفحص."}</p></div></div>;
  }
  if (attachment.kind === "image" || attachment.kind === "gif") return <div className="relative mt-4"><img src={attachment.url} alt={attachment.filename || "صُورَةٌ مُرْفَقَة"} className="max-h-[440px] w-full rounded-2xl border border-[#e0e8de] object-cover" /><span className="absolute right-3 top-3 rounded-full bg-[#163e33]/90 px-2.5 py-1 text-[10px] font-extrabold text-white">{attachment.kind === "gif" ? "GIF مُتَحَرِّك" : "صُورَة"}</span><AttachmentActions attachment={attachment} /></div>;
  if (attachment.kind === "video") return <div className="relative mt-4"><video controls preload="metadata" className="max-h-[440px] w-full rounded-2xl border border-[#e0e8de] bg-[#183b32]"><source src={attachment.url} type={attachment.mimeType || "video/mp4"} />لا يدعم متصفّحك تشغيل هذا الفيديو.</video><span className="absolute right-3 top-3 rounded-full bg-[#163e33]/90 px-2.5 py-1 text-[10px] font-extrabold text-white">فِيدْيُو</span><AttachmentActions attachment={attachment} /></div>;
  if (attachment.kind === "file") return <div className="mt-4 rounded-xl border border-[#e0e8de] bg-[#fafcf9] p-3"><a href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-[#176047]"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[#e1ebdf] text-[#2a6651]"><FileText size={17} /></span><span className="min-w-0 flex-1 truncate text-xs font-bold">{attachment.filename || "مَلَفٌّ مُرْفَق"}</span><ArrowUpRight size={16} /></a><AttachmentActions attachment={attachment} /></div>;
  return <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-3 rounded-xl border border-[#e0e8de] bg-[#fafcf9] p-3 hover:border-[#b9d0bd]"><Link2 size={17} className="text-[#2a6651]" /><span className="min-w-0 flex-1 truncate text-xs font-bold">{attachment.filename || attachment.url}</span><ArrowUpRight size={16} className="text-[#5b8875]" /></a>;
}

function PostCard({ post, isAuthor, onLike, onRepost, onSave, onReport, onDelete, onEdit, onSetVisibility }: { post: FeedPost; isAuthor: boolean; onLike: () => void; onRepost: () => void; onSave: () => void; onReport: () => void; onDelete: () => void; onEdit: () => void; onSetVisibility: (visibility: "public" | "friends") => void }) {
  const name = post.author.name || post.author.username || "عُضْوٌ في الدَّائِرَة";
  const style = post.textStyle === "serif" ? "font-display" : post.textStyle === "emphasis" ? "font-bold" : "";
  return <article className="rounded-[22px] border border-[#dfe6dc] bg-white p-4 shadow-[0_10px_30px_rgba(21,54,43,0.035)] sm:p-5"><div className="flex gap-3"><Avatar name={name} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="truncate text-sm font-extrabold text-[#193d33]">{name}</p>{post.author.username && <span className="text-xs text-[#809488]">@{post.author.username}</span>}<span className="text-xs text-[#809488]">{new Date(post.createdAt).toLocaleDateString("ar-SA")}</span></div></div><DropdownMenu><DropdownMenuTrigger asChild><button className="grid h-8 w-8 place-items-center rounded-lg text-[#698478] hover:bg-[#edf4ee] hover:text-[#176047]" aria-label="خِيَارَاتُ المَنْشُور"><MoreHorizontal size={18} /></button></DropdownMenuTrigger><DropdownMenuContent align="end" dir="rtl" className="min-w-48 border-[#dbe5dc] bg-[#fbfcf8] text-[#284b3e]">{isAuthor ? <><DropdownMenuLabel>خِيَارَاتُ مَنْشُورِكَ</DropdownMenuLabel><DropdownMenuItem onSelect={onEdit}><Pencil />تَحْرِير</DropdownMenuItem><DropdownMenuItem onSelect={() => onSetVisibility("public")} disabled={post.visibility === "public"}>لِلْعَامَّة</DropdownMenuItem><DropdownMenuItem onSelect={() => onSetVisibility("friends")} disabled={post.visibility === "friends"}><UsersRound />لِلْأَصْدِقَاءِ فَقَط</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 />حَذْفُ المَنْشُور</DropdownMenuItem></> : <><DropdownMenuLabel>خِيَارَاتُ المَنْشُور</DropdownMenuLabel><DropdownMenuItem onSelect={onReport}><Flag />إِبْلاغ</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></div>{post.title && <h2 className="mt-3 font-display text-lg font-semibold text-[#193d33]">{post.title}</h2>}{post.content && <p dir={containsArabic(post.content) ? "rtl" : "auto"} className={`mt-3 whitespace-pre-line text-[14px] leading-7 text-[#38574b] ${style} ${containsArabic(post.content) ? "arabic-content" : ""}`}>{post.content}</p>}{post.hashtags && <div className="mt-3 flex flex-wrap gap-2" dir="rtl">{post.hashtags.split(/\s+/).filter(Boolean).map(tag => <span key={tag} className="rounded-full bg-[#edf5ec] px-2.5 py-1 text-xs font-bold text-[#267052]">{tag}</span>)}</div>}{post.attachments.map((attachment, index) => <AttachmentPreview key={attachment.id ?? `${attachment.url}-${index}`} attachment={attachment} />)}<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0ea] pt-3"><PostComments postId={post.id} commentCount={post.commentCount} /><div className="flex flex-wrap gap-3"><button onClick={onRepost} className={`action-button ${post.repostedByViewer ? "text-[#267052]" : ""}`}><Repeat2 size={17} /><span>{post.repostCount || "إِعَادَةُ نَشْر"}</span></button><button onClick={onLike} className={`action-button ${post.likedByViewer ? "text-[#b75356]" : ""}`}><Heart size={17} fill={post.likedByViewer ? "currentColor" : "none"} /><span>{post.likeCount || "إِعْجَاب"}</span></button><button onClick={onSave} className={`action-button ${post.savedByViewer ? "text-[#267052]" : ""}`}><Bookmark size={16} fill={post.savedByViewer ? "currentColor" : "none"} /><span>{post.savedByViewer ? "مَحْفُوظ" : "حِفْظ"}</span></button>{!isAuthor && <button onClick={onReport} className="action-button text-[#a64b41]"><Flag size={16} /><span>إِبْلاغ</span></button>}</div></div></div></div></article>;
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [feedMode, setFeedMode] = useState<FeedMode>("following");
  const [reportPost, setReportPost] = useState<FeedPost | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const publicVisitor = !isAuthenticated;
  const effectiveFeedMode: FeedMode = publicVisitor ? "chronological" : feedMode;
  const feedQuery = trpc.social.feed.useQuery({ mode: effectiveFeedMode, visibilityScope: publicVisitor ? "public" : "all" });
  const ensureSignedIn = () => { if (isAuthenticated) return true; toast.info("سَجِّلِ الدُّخولَ للمشاركة في الدَّائِرَة."); setLocation("/auth"); return false; };
  const like = trpc.social.toggleLike.useMutation({ onSuccess: () => void utils.social.feed.invalidate(), onError: error => toast.error(error.message) });
  const repost = trpc.social.toggleRepost.useMutation({ onSuccess: () => void utils.social.feed.invalidate(), onError: error => toast.error(error.message) });
  const save = trpc.social.toggleSavedPost.useMutation({ onSuccess: result => { void utils.social.feed.invalidate(); toast.success(result.saved ? "حُفِظَ المنشور في إشاراتك." : "أُزيل المنشور من إشاراتك."); }, onError: error => toast.error(error.message) });
  const remove = trpc.social.deletePost.useMutation({ onSuccess: () => { void utils.social.feed.invalidate(); void utils.social.myPosts.invalidate(); toast.success("حُذِفَ مَنْشُورُكَ."); }, onError: error => toast.error(error.message) });
  const update = trpc.social.updatePost.useMutation({ onSuccess: () => { void utils.social.feed.invalidate(); setEditingPost(null); toast.success("حُدِّثَ المَنْشُور."); }, onError: error => toast.error(error.message) });
  const report = trpc.social.submitReport.useMutation({ onSuccess: () => { setReportPost(null); setReportDetails(""); toast.success("أُرْسِلَ الإِبْلاغُ إلى مالك المنصّة."); }, onError: error => toast.error(error.message) });
  const posts = (feedQuery.data ?? []) as FeedPost[];
  const authorName = user?.name || user?.username || "عُضْو";

  return <PlatformShell><main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9"><div className="grid gap-8 lg:grid-cols-[minmax(0,680px)_280px]"><section className="min-w-0"><section className="relative mb-6 overflow-hidden rounded-[26px] border border-[#dbe4d6] bg-[#0e3b31] px-5 py-6 text-[#f5f5ea] shadow-[0_16px_42px_rgba(13,59,49,0.16)] sm:px-7"><div className="geometric-orb" aria-hidden="true" /><div className="relative flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.19em] text-[#e6c96e]">خُلاصَتُكَ الهَادِئَة</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">السَّلامُ عَلَيْكُم، {isAuthenticated ? authorName.split(" ")[0] : "صَدِيقَ الدَّائِرَة"}.</h1><p className="mt-3 max-w-lg text-sm leading-6 text-[#cfddd3]">لا تَشْغيلَ تلقائيًّا، ولا تمريرًا بلا نهاية. أنت تختار ما تتابعه.</p></div><Sparkles className="hidden text-[#e1c065] sm:block" size={28} /></div></section><div className="mb-5 flex gap-5 overflow-x-auto border-b border-[#dfe5dc] px-1">{(["following", "chronological", "balanced"] as const).map(mode => <button key={mode} onClick={() => setFeedMode(mode)} className={`relative shrink-0 pb-3 text-sm font-bold ${feedMode === mode ? "text-[#12563f]" : "text-[#82958b]"}`}>{mode === "following" ? "المُتابَعون" : mode === "chronological" ? "الأَحْدَث" : "مُوازَن"}{feedMode === mode && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#bd9941]" />}</button>)}</div><section className="mb-5 rounded-[24px] border border-[#d7e6d7] bg-[#f9fcf7] p-5 shadow-[0_10px_28px_rgba(27,66,49,0.035)]"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0d4937] text-[#e6c96e]"><Palette size={20} /></span><div className="min-w-0 flex-1"><p className="text-xs font-extrabold tracking-[0.12em] text-[#a4822e]">مَكانُ النَّشْر</p><h2 className="mt-1 font-display text-xl font-semibold text-[#24483d]">اِصنَعْ مَحتواكَ في اِسْتُودْيُو المُنشِئ</h2><p className="mt-2 text-sm leading-6 text-[#668074]">أنشئ النصوص والصور والملفات والفيديو من مكان واحد، ثم راجع معاينة الفيديو قبل النشر.</p><Button type="button" onClick={() => setLocation(isAuthenticated ? "/studio" : "/auth")} className="mt-4 rounded-xl bg-[#0d4937] hover:bg-[#176047]"><Palette size={16} />{isAuthenticated ? "فَتحُ الاِسْتُودْيُو" : "تَسْجيلُ الدُّخولِ لِلنَّشْر"}</Button></div></div></section><div className="space-y-4">{feedQuery.isLoading ? <div className="feed-loader rounded-[22px] border border-[#dfe6dc] bg-white py-12 text-sm text-[#6c8579]"><span className="feed-loader__dot" /><span>يَجْرِي تَجْهِيزُ الخُلاصَةِ…</span></div> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} isAuthor={post.author.id === user?.id} onLike={() => { if (ensureSignedIn()) like.mutate({ postId: post.id }); }} onRepost={() => { if (ensureSignedIn()) repost.mutate({ postId: post.id }); }} onSave={() => { if (ensureSignedIn()) save.mutate({ postId: post.id }); }} onReport={() => { if (ensureSignedIn()) setReportPost(post); }} onDelete={() => { if (window.confirm("هل تريد حذف منشورك نهائيًّا؟")) remove.mutate({ postId: post.id }); }} onEdit={() => { setEditingPost(post); setEditedContent(post.content); }} onSetVisibility={visibility => update.mutate({ postId: post.id, visibility })} />) : <div className="feed-empty rounded-[22px] border border-dashed border-[#c9d9cc] bg-[#fbfcf8] px-6 py-12 text-center"><Sparkles className="mx-auto text-[#276c4e]" size={24} /><h2 className="mt-4 font-display text-xl font-semibold text-[#294d40]">الدَّائِرَةُ فارِغَةٌ</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#778d81]">لا توجد منشورات هنا الآن. أنشئ محتوى نافعاً من الاستوديو عندما تكون جاهزاً.</p></div>}<p className="py-6 text-center text-xs text-[#71877b]">وصلت إلى نهاية الخلاصة المقصودة. خذ وقتك؛ الدائرة ستبقى هنا.</p></div></section><aside className="space-y-4 lg:pt-[104px]"><section className="rounded-[22px] border border-[#dce5da] bg-[#fbfcf8] p-5"><div className="flex items-center gap-2 text-[#1c5844]"><ShieldAlert size={18} /><h2 className="text-sm font-extrabold">مِعْيَارُ الدَّائِرَة</h2></div><div className="mt-4 space-y-3">{["تكلَّم بصدقٍ وتثبَّت ممّا تشارك.", "احْمِ الناس من الاحتيال والتلاعب.", "اخْتَر المحتوى النّافع بدل التشتيت المتواصل.", "عامِل المسلمين بكرامةٍ ومن دون تحيّز."].map((rule, index) => <div key={rule} className="flex gap-3"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#e5efe5] text-[10px] font-extrabold text-[#237052]">0{index + 1}</span><p className="text-xs leading-5 text-[#567367]">{rule}</p></div>)}</div></section><section className="rounded-[22px] border border-[#e1d5ad] bg-[#f7f1db] p-5"><p className="text-[10px] font-bold tracking-[0.18em] text-[#8a6e27]">نِيَّةُ اليَوْم</p><p className="mt-2 font-display text-lg font-semibold leading-6 text-[#405542]">«النَّفْعُ قبلَ المَظاهِر، والحُضورُ بلا ضَغْط.»</p></section></aside></div></main><Dialog open={Boolean(reportPost)} onOpenChange={open => { if (!open) setReportPost(null); }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>الإِبْلاغُ عن مَنْشُور</DialogTitle><DialogDescription>أرسل بلاغاً دقيقاً إلى مالك المنصة. لا يُحذف المنشور تلقائياً.</DialogDescription></DialogHeader><Textarea value={reportDetails} onChange={event => setReportDetails(event.target.value)} placeholder="اشرح السبب باختصار…" className="min-h-28 text-right" /><DialogFooter><Button variant="outline" onClick={() => setReportPost(null)}>إلغاء</Button><Button disabled={!reportPost || report.isPending} onClick={() => reportPost && report.mutate({ postId: reportPost.id, category: "scam", details: reportDetails.trim() || undefined })}>{report.isPending ? <Loader2 className="animate-spin" size={16} /> : <Flag size={16} />}إرسال البلاغ</Button></DialogFooter></DialogContent></Dialog><Dialog open={Boolean(editingPost)} onOpenChange={open => { if (!open) setEditingPost(null); }}><DialogContent dir="rtl"><DialogHeader><DialogTitle>تَحْريرُ المَنْشُور</DialogTitle><DialogDescription>عدّل النص فقط؛ تبقى المرفقات كما نشرتها.</DialogDescription></DialogHeader><Textarea value={editedContent} onChange={event => setEditedContent(event.target.value)} maxLength={5000} className="min-h-32 text-right" /><DialogFooter><Button variant="outline" onClick={() => setEditingPost(null)}>إلغاء</Button><Button disabled={!editingPost || update.isPending} onClick={() => editingPost && update.mutate({ postId: editingPost.id, content: editedContent.trim() })}>{update.isPending ? <Loader2 className="animate-spin" size={16} /> : <Pencil size={16} />}حفظ التعديل</Button></DialogFooter></DialogContent></Dialog></PlatformShell>;
}
