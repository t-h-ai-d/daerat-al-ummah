import { useAuth } from "@/_core/hooks/useAuth";
import PlatformShell from "@/components/PlatformShell";
import { AttachmentPreview, type Attachment, type FeedPost } from "@/pages/Home";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BookOpen, FileText, ImageIcon, Loader2, MessageSquareText, Palette, Sparkles, UsersRound, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

type HubFilter = "all" | "discussion" | "video" | "image" | "file";

const filters: Array<{ value: HubFilter; label: string; icon: typeof Sparkles }> = [
  { value: "all", label: "الكل", icon: Sparkles },
  { value: "discussion", label: "نصوص ونقاش", icon: MessageSquareText },
  { value: "video", label: "فيديو", icon: Video },
  { value: "image", label: "صور", icon: ImageIcon },
  { value: "file", label: "ملفات", icon: FileText },
];

function matches(post: FeedPost, filter: HubFilter) {
  const attachments = post.attachments ?? [];
  if (filter === "all") return true;
  if (filter === "discussion") return attachments.length === 0;
  if (filter === "image") return attachments.some(attachment => attachment.kind === "image" || attachment.kind === "gif");
  return attachments.some(attachment => attachment.kind === filter);
}

function ContentCard({ post }: { post: FeedPost }) {
  const author = post.author.name || post.author.username || "عُضْوٌ في الدَّائِرَة";
  const primaryAttachment = post.attachments?.[0] as Attachment | undefined;
  return <article className="overflow-hidden rounded-[22px] border border-[#dfe6dc] bg-white p-4 shadow-[0_10px_28px_rgba(21,54,43,0.035)]">
    <div className="flex items-center justify-between gap-3 text-xs text-[#789084]">
      <span className="min-w-0 truncate font-bold text-[#305647]">{author}</span>
      <time className="shrink-0">{new Date(post.createdAt).toLocaleDateString("ar-SA")}</time>
    </div>
    {post.title && <h2 className="mt-3 font-display text-lg font-semibold text-[#1d493a]">{post.title}</h2>}
    {post.content && <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-7 text-[#4b695c]">{post.content}</p>}
    {primaryAttachment && <AttachmentPreview attachment={primaryAttachment} />}
    {post.attachments?.length > 1 && <p className="mt-3 text-xs font-bold text-[#53776a]">+ {post.attachments.length - 1} مرفقات أخرى</p>}
    {post.hashtags && <p className="mt-3 line-clamp-1 text-xs font-bold text-[#287052]">{post.hashtags}</p>}
  </article>;
}

export default function ContentHubPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<HubFilter>("all");
  const feed = trpc.social.feed.useQuery({ mode: "chronological" });
  const posts = useMemo(() => ((feed.data ?? []) as FeedPost[]).filter(post => matches(post, filter)).slice(0, 12), [feed.data, filter]);

  return <PlatformShell><main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9" dir="rtl">
    <section className="relative overflow-hidden rounded-[28px] border border-[#dbe5d7] bg-[#103e32] px-5 py-7 text-[#f5f5ea] shadow-[0_16px_42px_rgba(13,59,49,0.16)] sm:px-8">
      <div className="geometric-orb" aria-hidden="true" />
      <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><p className="text-[10px] font-bold tracking-[0.18em] text-[#e6c96e]">مَرْكَزُ المُحْتَوَى</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">محتوى نافع، في مكانٍ واحد.</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#d0ddd3]">اجمع نقاشاتك وفيديوهاتك وصورك وملفاتك وموارد مجتمعك من دون توصيات قهرية أو تمريرٍ بلا نهاية.</p></div><Button onClick={() => setLocation(isAuthenticated ? "/studio" : "/auth")} className="shrink-0 rounded-xl bg-[#e7cb73] text-[#183e32] hover:bg-[#f0d985]"><Palette size={16} />{isAuthenticated ? "النَّشْرُ مِنَ الاِسْتُودْيُو" : "تَسْجِيلُ الدُّخُولِ لِلنَّشْر"}</Button></div>
    </section>
    <section className="mt-6 grid gap-3 sm:grid-cols-3"><button onClick={() => setLocation("/communities")} className="rounded-2xl border border-[#dce6dc] bg-[#fbfcf8] p-4 text-right transition hover:border-[#9dbda5]"><UsersRound className="text-[#176047]" size={20} /><h2 className="mt-3 font-bold text-[#244c3e]">المجتمعات</h2><p className="mt-1 text-xs leading-5 text-[#738a7f]">مناقشات منظّمة وموارد مثبتة.</p></button><button onClick={() => setLocation("/saved")} className="rounded-2xl border border-[#dce6dc] bg-[#fbfcf8] p-4 text-right transition hover:border-[#9dbda5]"><BookOpen className="text-[#176047]" size={20} /><h2 className="mt-3 font-bold text-[#244c3e]">المحفوظات</h2><p className="mt-1 text-xs leading-5 text-[#738a7f]">اجمع ما ينفعك في مجموعات خاصة.</p></button><button onClick={() => setLocation("/explore")} className="rounded-2xl border border-[#dce6dc] bg-[#fbfcf8] p-4 text-right transition hover:border-[#9dbda5]"><Sparkles className="text-[#176047]" size={20} /><h2 className="mt-3 font-bold text-[#244c3e]">استكشاف مقصود</h2><p className="mt-1 text-xs leading-5 text-[#738a7f]">ابحث بالكلمات والوسوم، لا بتوصيات خفية.</p></button></section>
    <section className="mt-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold tracking-[0.14em] text-[#a4822e]">مَكْتَبَةُ الدَّائِرَة</p><h2 className="mt-1 font-display text-2xl font-semibold text-[#244c3e]">نتائج محدودة تختارها أنت</h2></div><p className="text-xs text-[#70877b]">حتى 12 مادة في كل عرض</p></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{filters.map(item => { const Icon = item.icon; return <button key={item.value} onClick={() => setFilter(item.value)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${filter === item.value ? "border-[#176047] bg-[#176047] text-white" : "border-[#d6e1d6] bg-white text-[#557569] hover:border-[#9dbda5]"}`}><Icon size={14} />{item.label}</button>; })}</div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{feed.isLoading ? <div className="col-span-full flex justify-center py-16 text-sm text-[#6f887b]"><Loader2 className="ml-2 animate-spin" size={18} />يَجْرِي تَجْهِيزُ المَكْتَبَة…</div> : posts.length ? posts.map(post => <ContentCard key={post.id} post={post} />) : <div className="col-span-full rounded-[22px] border border-dashed border-[#c9d9cc] bg-[#fbfcf8] px-6 py-12 text-center"><Sparkles className="mx-auto text-[#276c4e]" size={24} /><h2 className="mt-4 font-display text-xl font-semibold text-[#294d40]">لا توجد مواد في هذا العرض</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#778d81]">غيّر نوع المحتوى، أو أضف مادة نافعة من استوديو المُنشئ.</p></div>}</div></section>
  </main></PlatformShell>;
}
