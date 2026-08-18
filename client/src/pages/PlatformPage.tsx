import { useAuth } from "@/_core/hooks/useAuth";
import PlatformShell from "@/components/PlatformShell";
import FriendPrivacyPanel from "@/components/FriendPrivacyPanel";
import CreatorStudio from "@/components/CreatorStudio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bell, FileSearch, Loader2, Search, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

type PageKind = "explore" | "notifications" | "rules" | "profile";

const rules = [
  ["Truth is a trust", "Do not knowingly share lies, misleading claims, impersonation, or manipulated material. If you are uncertain, say so and seek reliable sources."],
  ["No scams or exploitation", "Do not solicit money, credentials, private details, or engagement through deception, pressure, or false promises."],
  ["No brainrot", "Avoid empty outrage, compulsive-scroll bait, degrading trends, and content designed to drain attention without benefit."],
  ["Respect the sacred", "Do not post haram imagery or content that mocks faith, people, or Islamic practices. Disagree with adab and without sectarian bias."],
  ["Protect the circle", "If you see harmful content, use the report action to open a prefilled email to the owner. Choose the clearest category and include only relevant details."],
];

function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div className="mb-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a4822e]">{eyebrow}</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] text-[#163e33] sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#678073]">{body}</p></div>;
}

function Explore() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const utils = trpc.useUtils();
  const results = trpc.social.search.useQuery({ query: submitted || "_" }, { enabled: Boolean(submitted) });
  const follow = trpc.social.toggleFollow.useMutation({ onSuccess: () => { utils.social.search.invalidate(); toast.success("Your following list has been updated."); }, onError: error => toast.error(error.message) });
  const { isAuthenticated } = useAuth();
  const search = (event: React.FormEvent) => { event.preventDefault(); setSubmitted(query.trim()); };
  const followPerson = (targetUserId: number) => { if (!isAuthenticated) { toast.info("سجّل الدخول لمتابعة الأعضاء."); window.location.href = "/auth"; return; } follow.mutate({ targetUserId }); };
  return <div className="max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><PageIntro eyebrow="Discover with intention" title="Explore the circle" body="Find people and useful conversations by name, keyword, or hashtag. Search is designed for depth, not endless recommendations." /><form onSubmit={search} className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#799184]" size={18} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search people, posts, or #topics" className="h-13 rounded-2xl border-[#d8e2d7] bg-white pl-11 text-sm shadow-sm" /></form><div className="mt-6"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b9287]">Try a topic</p><div className="mt-3 flex flex-wrap gap-2">{["#seekknowledge", "#mindfulmedia", "#service", "#quranreflection", "#goodcharacter"].map(topic => <button onClick={() => { setQuery(topic); setSubmitted(topic); }} key={topic} className="rounded-full border border-[#dce6dc] bg-white px-3.5 py-2 text-xs font-bold text-[#346653] transition-colors hover:border-[#a9c6b2] hover:bg-[#ecf4ed]">{topic}</button>)}</div></div>{results.isFetching && <div className="mt-7 flex items-center gap-2 text-sm text-[#6a8377]"><Loader2 className="animate-spin" size={17} />Searching the circle…</div>}{submitted && !results.isFetching && <div className="mt-8 space-y-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b9287]">People</p><div className="mt-3 space-y-3">{results.data?.people?.length ? results.data.people.map(person => <div key={person.id} className="flex items-start justify-between gap-4 rounded-[20px] border border-[#dce5da] bg-white p-4"><div className="flex min-w-0 gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e5efe5] text-xs font-extrabold text-[#176047]">{(person.name || person.username || "UC").split(" ").map(part => part[0]).join("").slice(0, 2)}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#264a3e]">{person.name || person.username || "Circle member"}</p>{person.username && <p className="mt-0.5 text-xs text-[#82968b]">@{person.username}</p>}{person.bio && <p className="mt-2 text-xs leading-5 text-[#6b8378]">{person.bio}</p>}{(person.country || person.madhhabPreference) && <p className="mt-2 text-[11px] font-semibold text-[#8a9c92]">{[person.country, person.madhhabPreference].filter(Boolean).join(" · ")}</p>}</div></div><Button onClick={() => followPerson(person.id)} disabled={follow.isPending} className="shrink-0 rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]"><UserPlus size={15} />Follow</Button></div>) : <p className="rounded-xl border border-dashed border-[#d4dfd4] px-4 py-5 text-sm text-[#778d82]">No people matched this search yet.</p>}</div></div><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7b9287]">Posts</p><div className="mt-3 space-y-3">{results.data?.posts?.length ? results.data.posts.map(post => <div key={post.id} className="rounded-[20px] border border-[#dce5da] bg-white p-4"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e5efe5] text-[#21684b]"><UsersRound size={14} /></span><p className="text-xs font-bold text-[#46685a]">{post.authorName || post.authorUsername || "Circle member"}</p></div><p className="mt-3 text-sm leading-6 text-[#3c5d50]">{post.content}</p>{post.hashtags && <p className="mt-3 text-xs font-bold text-[#34735a]">{post.hashtags}</p>}</div>) : <p className="rounded-xl border border-dashed border-[#d4dfd4] px-4 py-5 text-sm text-[#778d82]">No posts matched this search yet.</p>}</div></div></div>}</div>;
}

function Rules() {
  return <div className="max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><PageIntro eyebrow="A shared amanah" title="Community rules" body="These are simple on purpose. They protect trust, attention, and the dignity of everyone in the circle." /><div className="overflow-hidden rounded-[24px] border border-[#dce5da] bg-white">{rules.map(([title, text], index) => <div key={title} className="flex gap-4 border-b border-[#edf1eb] p-5 last:border-0 sm:p-6"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e6f0e5] text-xs font-extrabold text-[#1d674b]">0{index + 1}</span><div><h2 className="text-sm font-extrabold text-[#23483c]">{title}</h2><p className="mt-1.5 text-sm leading-6 text-[#668075]">{text}</p></div></div>)}</div><div className="mt-6 rounded-[20px] border border-[#e0d4aa] bg-[#f8f2df] p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 text-[#967726]" size={19} /><p className="text-sm leading-6 text-[#61705c]">عند الإبلاغ عن محتوى، اختر الفئة الأدق: <strong>احتيال</strong> أو <strong>كذب</strong> أو <strong>محتوى مُفسد للعقل</strong> أو <strong>صور محرّمة</strong>. سيُفتح بريد موجّه مباشرة إلى مالك الموقع.</p></div><a href="mailto:ssbmbwuugame@gmail.com?subject=%D8%A8%D9%84%D8%A7%D8%BA%20%D8%AF%D8%A7%D8%A6%D8%B1%D8%A9%20%D8%A7%D9%84%D8%A3%D9%85%D8%A9" className="mt-4 inline-flex text-xs font-extrabold text-[#155a40] underline decoration-[#c6a04a] underline-offset-4">ssbmbwuugame@gmail.com</a></div><a href="/terms" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#155a40] underline decoration-[#c6a04a] underline-offset-4">اقرأ ميثاق الدائرة وشروط الاستخدام <FileSearch size={16} /></a></div>;
}

function Notifications() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const notifications = trpc.social.notifications.useQuery(undefined, { enabled: isAuthenticated });
  const markRead = trpc.social.markNotificationRead.useMutation({ onSuccess: () => utils.social.notifications.invalidate() });
  if (!isAuthenticated) return <div className="max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><PageIntro eyebrow="ابقَ على اطلاع" title="الإشعارات" body="ستظهر هنا المتابعات والردود والإشارات المرتبطة بدائرتك." /><div className="rounded-[24px] border border-dashed border-[#cbd9cd] bg-[#fbfcf8] px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5efe5] text-[#25684d]"><Bell size={24} /></span><h2 className="mt-5 font-display text-xl font-semibold text-[#264b3e]">سجّل الدخول لرؤية تحديثاتك.</h2><Button onClick={() => { window.location.href = "/auth"; }} className="mt-5 rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]">انضم إلى الدائرة</Button></div></div>;
  return <div className="max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><PageIntro eyebrow="Stay in the loop" title="Notifications" body="You will only see activity directly connected to your circle, without artificial engagement prompts." />{notifications.isLoading ? <div className="flex items-center gap-2 text-sm text-[#6c8579]"><Loader2 className="animate-spin" size={17} />Loading notifications…</div> : notifications.data?.length ? <div className="overflow-hidden rounded-[24px] border border-[#dce5da] bg-white">{notifications.data.map(({ notification, actorName, actorUsername, actorAvatar }) => <button key={notification.id} onClick={() => !notification.readAt && markRead.mutate({ notificationId: notification.id })} className={`flex w-full items-start gap-3 border-b border-[#edf1eb] p-5 text-left last:border-0 ${notification.readAt ? "bg-white" : "bg-[#f5faf5]"}`}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e5efe5] text-xs font-extrabold text-[#176047]">{(actorName || actorUsername || "UC").split(" ").map(part => part[0]).join("").slice(0, 2)}</span><div><p className="text-sm leading-6 text-[#335548]"><strong>{actorName || actorUsername || "عضو في الدائرة"}</strong> {notification.message}</p><p className="mt-1 text-[11px] font-semibold text-[#81978b]">{new Date(notification.createdAt).toLocaleString("ar")}</p></div>{!notification.readAt && <span className="ml-auto mt-2 h-2 w-2 rounded-full bg-[#c29b42]" />}</button>)}</div> : <div className="rounded-[24px] border border-dashed border-[#cbd9cd] bg-[#fbfcf8] px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5efe5] text-[#25684d]"><Bell size={24} /></span><h2 className="mt-5 font-display text-xl font-semibold text-[#264b3e]">مساحتك هادئة الآن.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#748a7f]">ستظهر الإشعارات للمتابعين الجدد والإعجابات والتعليقات وإعادة النشر والإشارات.</p></div>}</div>;
}

function Profile() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const profile = trpc.social.myProfile.useQuery(undefined, { enabled: isAuthenticated });
  const update = trpc.social.updateProfile.useMutation({
    onSuccess: async () => { await utils.social.myProfile.invalidate(); toast.success("تم حفظ الملف الشخصي."); },
    onError: error => toast.error(error.message),
  });
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [madhhab, setMadhhab] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!profile.data) return;
    setBio(profile.data.bio || "");
    setCountry(profile.data.country || "");
    setMadhhab(profile.data.madhhabPreference || "");
    setUsername(profile.data.username || "");
  }, [profile.data]);

  const save = () => {
    if (!isAuthenticated) { window.location.href = "/auth"; return; }
    update.mutate({
      ...(username.trim() ? { username: username.trim() } : {}),
      bio: bio.trim(),
      country: country.trim(),
      madhhabPreference: madhhab.trim(),
    });
  };
  const avatarUrl = profile.data?.avatarUrl || "";
  const initials = (profile.data?.name || user?.name || "UC").split(" ").map(part => part[0]).join("").slice(0, 2);

  return <div className="max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
    <PageIntro eyebrow="مكانك في الدائرة" title="الملف الشخصي والهوية" body="حقول البلد والتوجه المذهبي اختيارية. تُعرض باحترام ولا تُستخدم لترتيب الناس أو تقييد مشاركتهم." />
    <div className="grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]">
      <section className="rounded-[24px] bg-[#0e3c31] p-6 text-center text-[#edf4ec]">
        {avatarUrl ? <img src={avatarUrl} alt="الصورة الشخصية" className="mx-auto h-20 w-20 rounded-[26px] object-cover" /> : <span className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-[#e5c968] font-display text-2xl font-bold text-[#153d32]">{initials}</span>}
        <p className="mt-4 text-lg font-extrabold">{profile.data?.name || user?.name || "عضو"}</p>
        <p className="mt-1 text-xs text-[#b5cbbf]">{isAuthenticated ? "حسابك في دائرة الأمة" : "سجّل الدخول لإعداد ملفك"}</p>
        <Badge className="mt-4 bg-white/10 text-[#e7cb70] hover:bg-white/10">هوية باحترام</Badge>
      </section>
      <section className="rounded-[24px] border border-[#dce5da] bg-white p-5 sm:p-6">
        <div className="grid gap-5">
          <label className="grid gap-2 text-xs font-bold text-[#496a5c]">نبذة<Textarea value={bio} onChange={event => setBio(event.target.value)} placeholder="اكتب نبذة قصيرة عن النفع الذي تأمل تقديمه." className="min-h-24 rounded-xl border-[#dbe5dc] text-sm font-normal" /></label>
          <label className="grid gap-2 text-xs font-bold text-[#496a5c]">اسم المستخدم<Input value={username} onChange={event => setUsername(event.target.value)} placeholder="اختياري — حروف أو أرقام أو شرطات سفلية" className="h-10 rounded-xl border-[#dbe5dc] text-sm font-normal" /></label>
          <p className="rounded-xl border border-[#dce8dc] bg-[#f8fbf7] px-3 py-2 text-xs leading-5 text-[#5a766a]">لتغيير الصورة الشخصية، استخدم زر <strong>رفع صورة</strong> في استوديو المنشئ أدناه. لا تحتاج إلى رابط.</p>
          <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-xs font-bold text-[#496a5c]">البلد<Input value={country} onChange={event => setCountry(event.target.value)} placeholder="اختياري" className="h-10 rounded-xl border-[#dbe5dc] text-sm font-normal" /></label><label className="grid gap-2 text-xs font-bold text-[#496a5c]">التوجه المذهبي<Input value={madhhab} onChange={event => setMadhhab(event.target.value)} placeholder="اختياري — يُعرض باحترام" className="h-10 rounded-xl border-[#dbe5dc] text-sm font-normal" /></label></div>
          <Button onClick={save} disabled={update.isPending} className="w-fit rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]">{update.isPending && <Loader2 className="animate-spin" size={14} />}حفظ الملف</Button>
        </div>
      </section>
    </div>
  </div>;
}

export default function PlatformPage({ kind }: { kind: PageKind }) {
  const [location] = useLocation();
  const page = kind === "explore" ? <Explore /> : kind === "notifications" ? <Notifications /> : kind === "profile" ? <><Profile /><FriendPrivacyPanel /><CreatorStudio /></> : <Rules />;
  return <PlatformShell key={location}>{page}</PlatformShell>;
}
