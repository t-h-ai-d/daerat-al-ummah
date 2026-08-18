import PlatformShell from "@/components/PlatformShell";
import EmojiPicker from "@/components/EmojiPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { ownerReviewMailto } from "@/lib/ownerReview";
import { trpc } from "@/lib/trpc";
import { Globe2, Layers3, Loader2, LockKeyhole, MessageSquareText, Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

type CommunityKind = "community" | "group";
type Visibility = "public" | "members";

function visibilityLabel(visibility: Visibility) {
  return visibility === "public" ? "عام" : "للأعضاء";
}

function kindLabel(kind: "community" | "group" | "subcommunity") {
  if (kind === "group") return "مجموعة";
  if (kind === "subcommunity") return "مجتمع فرعي";
  return "مجتمع";
}

function CommunityBadge({ kind, visibility }: { kind: "community" | "group" | "subcommunity"; visibility: Visibility }) {
  return <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold">
    <span className="rounded-full bg-[#e6f0e5] px-2.5 py-1 text-[#176047]">{kindLabel(kind)}</span>
    <span className="flex items-center gap-1 rounded-full bg-[#f6f0df] px-2.5 py-1 text-[#896c1f]">{visibility === "public" ? <Globe2 size={12} /> : <LockKeyhole size={12} />}{visibilityLabel(visibility)}</span>
  </div>;
}

function CreateCommunityForm({ parentId, onDone }: { parentId?: number; onDone: (slug: string) => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<CommunityKind>("community");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const create = trpc.social.createCommunity.useMutation({
    onSuccess: (_, input) => {
      toast.success(parentId ? "تم إنشاء المجتمع الفرعي." : "تم إنشاء المساحة.");
      void utils.social.communities.invalidate();
      onDone(input.slug);
    },
    onError: error => toast.error(error.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    create.mutate({ name, slug: slug.trim().toLowerCase(), description, kind: parentId ? "group" : kind, parentId, visibility });
  };

  return <form onSubmit={submit} className="space-y-3 rounded-[24px] border border-[#d9e4d7] bg-white p-5 shadow-[0_14px_38px_rgba(16,61,46,0.06)]">
    <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5efe5] text-[#176047]"><Plus size={18} /></span><div><h2 className="font-display text-lg font-semibold text-[#214b3c]">{parentId ? "أنشئ مجتمعًا فرعيًا" : "أنشئ مساحة نافعة"}</h2><p className="mt-0.5 text-xs leading-5 text-[#788f84]">{parentId ? "تابع موضوعًا محددًا داخل هذا المجتمع." : "يمكن أن تكون مجتمعًا واسعًا أو مجموعة صغيرة واضحة الهدف."}</p></div></div>
    <Input required value={name} onChange={event => setName(event.target.value)} maxLength={120} placeholder="اسم المساحة" className="h-11 rounded-xl border-[#dce5da] text-right" />
    <Input required value={slug} onChange={event => setSlug(event.target.value.replace(/\s+/g, "-").toLowerCase())} maxLength={96} placeholder="رابط قصير: quran-study" dir="ltr" className="h-11 rounded-xl border-[#dce5da] text-left" />
    <Textarea required value={description} onChange={event => setDescription(event.target.value)} minLength={12} maxLength={1600} placeholder="ما الفائدة التي ستقدّمها هذه المساحة؟" className="min-h-24 rounded-xl border-[#dce5da] text-right" />
    <div className="grid gap-3 sm:grid-cols-2">
      {!parentId && <label className="space-y-1 text-xs font-bold text-[#47685b]"><span>النوع</span><select value={kind} onChange={event => setKind(event.target.value as CommunityKind)} className="h-11 w-full rounded-xl border border-[#dce5da] bg-white px-3 text-right"><option value="community">مجتمع</option><option value="group">مجموعة</option></select></label>}
      <label className="space-y-1 text-xs font-bold text-[#47685b]"><span>الوصول</span><select value={visibility} onChange={event => setVisibility(event.target.value as Visibility)} className="h-11 w-full rounded-xl border border-[#dce5da] bg-white px-3 text-right"><option value="public">عام</option><option value="members">للأعضاء</option></select></label>
    </div>
    <Button disabled={create.isPending} className="w-full rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]">{create.isPending && <Loader2 className="animate-spin" size={15} />} {parentId ? "إنشاء المجتمع الفرعي" : "إنشاء المساحة"}</Button>
  </form>;
}

export function CommunitiesPage() {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const communities = trpc.social.communities.useQuery();
  const [showCreate, setShowCreate] = useState(false);

  return <PlatformShell><main className="mx-auto w-full max-w-[1240px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10"><section className="overflow-hidden rounded-[28px] border border-[#cfe0d2] bg-[#0d4937] px-6 py-7 text-white shadow-[0_20px_50px_rgba(13,59,49,0.15)] sm:px-8"><p className="text-xs font-extrabold tracking-[0.18em] text-[#d9b85b]">مجتمعات دائرة الأمة</p><div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><h1 className="font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">مكان للصحبة النافعة، لا للضجيج.</h1><p className="mt-3 max-w-xl text-sm leading-7 text-[#d6e6dc]">أنشئ مجتمعًا أو مجموعة بغاية واضحة، ثم افتح مجتمعًا فرعيًا عند الحاجة. لا اقتراحات قهرية ولا تمرير بلا نهاية.</p></div><Button onClick={() => isAuthenticated ? setShowCreate(value => !value) : navigate("/auth")} className="shrink-0 rounded-xl bg-[#d9b85b] text-xs font-extrabold text-[#173e31] hover:bg-[#ead178]"><Plus size={16} />أنشئ مساحة</Button></div></section>
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-2xl font-semibold text-[#244c3e]">المجتمعات المتاحة</h2><p className="mt-1 text-sm text-[#738a7f]">اختر مساحة توافق هدفك، ثم انضم بإرادتك.</p></div><span className="rounded-full bg-[#e5efe5] px-3 py-1.5 text-xs font-extrabold text-[#176047]">{communities.data?.length ?? 0} مساحة</span></div>
      {communities.isLoading ? <div className="flex min-h-52 items-center justify-center rounded-[24px] border border-[#dce5da] bg-white text-sm text-[#668075]"><Loader2 className="ml-2 animate-spin" size={17} />يجري تحميل المساحات…</div> : communities.data?.length ? <div className="grid gap-4 sm:grid-cols-2">{communities.data.map(community => <button key={community.id} onClick={() => navigate(`/communities/${community.slug}`)} className="group rounded-[24px] border border-[#dce5da] bg-white p-5 text-right shadow-[0_12px_30px_rgba(16,61,46,0.04)] transition hover:-translate-y-0.5 hover:border-[#aac5ad]"><div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e6f0e5] text-[#176047]"><UsersRound size={20} /></span><CommunityBadge kind={community.kind} visibility={community.visibility} /></div><h3 className="mt-5 font-display text-xl font-semibold text-[#244c3e] group-hover:text-[#0d4937]">{community.name}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6b8377]">{community.description}</p><div className="mt-5 flex items-center justify-between border-t border-[#edf2eb] pt-3 text-xs font-bold text-[#799084]"><span>{community.memberCount} عضو</span><span className="text-[#176047]">{community.joined ? "أنت عضو" : "افتح المساحة"}</span></div></button>)}</div> : <div className="rounded-[24px] border border-dashed border-[#c8d8c9] bg-[#fbfcf8] px-6 py-14 text-center"><Layers3 className="mx-auto text-[#6e927d]" size={28} /><h3 className="mt-4 font-display text-xl font-semibold text-[#244c3e]">ابدأ بأول مساحة نافعة.</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#71887c]">أنشئ مجتمعًا بهدف واضح، مثل التعلّم أو خدمة الناس أو تدبّر القرآن.</p></div>}</section>
      <aside className="space-y-4">{showCreate && <CreateCommunityForm onDone={slug => navigate(`/communities/${slug}`)} />}<div className="rounded-[24px] border border-[#e2d6ad] bg-[#faf5e5] p-5"><h3 className="font-display text-lg font-semibold text-[#5c522f]">قاعدة المساحة</h3><p className="mt-2 text-sm leading-6 text-[#746b4c]">لا تنشئ مساحة بلا هدف. اكتب فائدة واضحة، واحفظ أدب الحوار، ولا تستخدم الاسم أو التصميم لخداع الناس.</p></div></aside>
    </div></main></PlatformShell>;
}

export function CommunityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const community = trpc.social.community.useQuery({ slug: slug ?? "" });
  const communityId = community.data?.community.id ?? 0;
  const feed = trpc.social.communityFeed.useQuery({ communityId }, { enabled: Boolean(communityId) });
  const [content, setContent] = useState("");
  const [showSubcommunityForm, setShowSubcommunityForm] = useState(false);
  const join = trpc.social.joinCommunity.useMutation({ onSuccess: () => { toast.success("أصبحت عضوًا في هذه المساحة."); void utils.social.community.invalidate({ slug: slug ?? "" }); void utils.social.communities.invalidate(); }, onError: error => toast.error(error.message) });
  const leave = trpc.social.leaveCommunity.useMutation({ onSuccess: () => { toast.success("غادرت المساحة."); void utils.social.community.invalidate({ slug: slug ?? "" }); void utils.social.communities.invalidate(); }, onError: error => toast.error(error.message) });
  const createPost = trpc.social.createPost.useMutation({ onSuccess: result => { setContent(""); void feed.refetch(); if (result.moderation.status === "under_review") toast.message(result.moderation.message, { duration: 10_000, action: { label: "مراسلة المالك", onClick: () => { window.location.href = ownerReviewMailto(result.postId); } } }); else toast.success("تم نشر مشاركتك في المساحة."); }, onError: error => toast.error(error.message) });
  const details = community.data;

  if (community.isLoading) return <PlatformShell><main className="mx-auto flex min-h-[55vh] max-w-4xl items-center justify-center px-4 text-sm text-[#668075]"><Loader2 className="ml-2 animate-spin" size={18} />يجري فتح المساحة…</main></PlatformShell>;
  if (community.error || !details) return <PlatformShell><main className="mx-auto max-w-4xl px-4 py-12"><div className="rounded-[24px] border border-[#e2d6ad] bg-[#faf5e5] p-6 text-center"><h1 className="font-display text-2xl font-semibold text-[#5c522f]">تعذّر فتح المساحة.</h1><p className="mt-2 text-sm text-[#746b4c]">قد تكون المساحة للأعضاء فقط أو لم تعد موجودة.</p><Button onClick={() => navigate("/communities")} className="mt-5 rounded-xl bg-[#0d4937] text-xs">العودة إلى المجتمعات</Button></div></main></PlatformShell>;

  const { community: item, membership } = details;
  const joinOrLeave = () => {
    if (!isAuthenticated) return navigate("/auth");
    if (membership?.role === "owner") return toast.message("أنت مالك هذه المساحة.");
    if (membership) return leave.mutate({ communityId: item.id });
    join.mutate({ communityId: item.id });
  };
  const publish = (event: React.FormEvent) => { event.preventDefault(); if (content.trim()) createPost.mutate({ content: content.trim(), visibility: "public", communityId: item.id, attachments: [] }); };

  return <PlatformShell><main className="mx-auto w-full max-w-[1120px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10"><button onClick={() => navigate("/communities")} className="mb-5 text-xs font-extrabold text-[#356953] hover:underline">← العودة إلى المجتمعات</button><section className="rounded-[28px] border border-[#cfe0d2] bg-white p-6 shadow-[0_14px_38px_rgba(16,61,46,0.05)] sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="max-w-2xl"><CommunityBadge kind={item.kind} visibility={item.visibility} /><h1 className="mt-4 font-display text-3xl font-semibold tracking-[-0.045em] text-[#1e493a] sm:text-4xl">{item.name}</h1><p className="mt-3 text-sm leading-7 text-[#668075]">{item.description}</p><p className="mt-4 text-xs font-bold text-[#81978b]">{details.memberCount} عضوًا في هذه المساحة</p></div><Button onClick={joinOrLeave} disabled={join.isPending || leave.isPending} className="rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]">{membership?.role === "owner" ? "أنت المالك" : membership ? "مغادرة المساحة" : "انضم إلى المساحة"}</Button></div></section>
    {membership && <section className="mt-6 rounded-[24px] border border-[#dce5da] bg-white p-5"><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-semibold text-[#244c3e]">شارك بفائدة</h2><EmojiPicker onSelect={emoji => setContent(value => `${value}${emoji}`)} /></div><form onSubmit={publish}><Textarea value={content} onChange={event => setContent(event.target.value)} maxLength={5000} placeholder={`ما الذي تريد مشاركته في ${item.name}؟`} className="min-h-28 rounded-xl border-[#dce5da] text-right" /><div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-[#81978b]">منشورات هذه المساحة محدودة وليست تمريرًا لا نهائيًا.</span><Button disabled={createPost.isPending || !content.trim()} className="rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]">{createPost.isPending && <Loader2 className="animate-spin" size={14} />}انشر بأدب</Button></div></form></section>}
    <section className="mt-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-2xl font-semibold text-[#244c3e]">منشورات المساحة</h2><p className="mt-1 text-sm text-[#738a7f]">خلاصة محدودة: حتى 40 منشورًا حديثًا.</p></div><MessageSquareText className="text-[#6e927d]" size={22} /></div>{feed.isLoading ? <div className="rounded-[24px] border border-[#dce5da] bg-white p-10 text-center text-sm text-[#668075]"><Loader2 className="mx-auto mb-2 animate-spin" size={18} />يجري تحميل المنشورات…</div> : feed.data?.length ? <div className="space-y-4">{feed.data.map(post => <article key={post.id} className="rounded-[24px] border border-[#dce5da] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-[#244c3e]">{post.author.name || post.author.username || "عضو في الدائرة"}</p><p className="mt-0.5 text-[11px] text-[#81978b]">{new Date(post.createdAt).toLocaleString("ar")}</p></div><span className="rounded-full bg-[#e6f0e5] px-2.5 py-1 text-[11px] font-bold text-[#176047]">{post.visibility === "public" ? "عام" : "للأصدقاء"}</span></div>{post.title && <h3 className="mt-4 font-display text-lg font-semibold text-[#244c3e]">{post.title}</h3>}<p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#3e5c50]">{post.content}</p>{post.attachments.filter(attachment => attachment.kind === "gif" || attachment.kind === "image").map(attachment => <img key={attachment.id} src={attachment.url} alt="مرفق منشور" className="mt-4 max-h-96 w-full rounded-xl object-cover" />)}<p className="mt-4 border-t border-[#edf2eb] pt-3 text-xs text-[#84978c]">{post.likeCount} إعجاب · {post.commentCount} تعليق · {post.repostCount} مشاركة</p></article>)}</div> : <div className="rounded-[24px] border border-dashed border-[#c8d8c9] bg-[#fbfcf8] px-6 py-12 text-center"><MessageSquareText className="mx-auto text-[#6e927d]" size={27} /><h3 className="mt-4 font-display text-xl font-semibold text-[#244c3e]">لا توجد منشورات بعد.</h3><p className="mt-2 text-sm text-[#71887c]">ابدأ بمشاركة نافعة، أو انضم أولًا لتتمكن من النشر.</p></div>}</section>
    {membership && <section className="mt-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-2xl font-semibold text-[#244c3e]">المجتمعات الفرعية</h2><p className="mt-1 text-sm text-[#738a7f]">افتح موضوعًا أدق داخل هذه المساحة عند الحاجة.</p></div><Button onClick={() => setShowSubcommunityForm(value => !value)} variant="outline" className="rounded-xl border-[#c9d9c8] bg-white text-xs text-[#176047]"><Plus size={15} />إضافة فرعي</Button></div>{showSubcommunityForm && <div className="mt-4 max-w-xl"><CreateCommunityForm parentId={item.id} onDone={newSlug => navigate(`/communities/${newSlug}`)} /></div>}{details.subcommunities.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{details.subcommunities.map(subcommunity => <button key={subcommunity.id} onClick={() => navigate(`/communities/${subcommunity.slug}`)} className="rounded-2xl border border-[#dce5da] bg-white p-4 text-right hover:border-[#aac5ad]"><CommunityBadge kind={subcommunity.kind} visibility={subcommunity.visibility} /><h3 className="mt-3 font-bold text-[#244c3e]">{subcommunity.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#71887c]">{subcommunity.description}</p></button>)}</div> : <p className="mt-4 rounded-2xl bg-[#f6f8f4] p-4 text-sm text-[#71887c]">لا توجد مجتمعات فرعية بعد.</p>}</section>}
  </main></PlatformShell>;
}
