import { useAuth } from "@/_core/hooks/useAuth";
import PlatformShell from "@/components/PlatformShell";
import FriendPrivacyPanel from "@/components/FriendPrivacyPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Bell, Bookmark, FileSearch, ImageUp, Loader2, Search, ShieldCheck, Trash2, UserPlus, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

type PageKind = "explore" | "saved" | "notifications" | "rules" | "profile";

const rules = [
  ["الصدق أمانة", "لا تنشر عمدًا كذبًا أو ادعاءً مضلّلًا أو انتحالًا أو مادةً محرّفة. وإن لم تكن متيقنًا فقل ذلك وارجع إلى المصادر الموثوقة."],
  ["لا للاحتيال أو الاستغلال", "لا تطلب مالًا أو بيانات دخول أو خصوصيات أو تفاعلًا بالخداع أو الضغط أو الوعود الكاذبة."],
  ["لا للمحتوى المُفسد للعقل", "تجنّب الغضب الفارغ وطُعوم التمرير القهري والصيحات المُهينة والمحتوى المصمَّم لاستنزاف الانتباه بلا فائدة."],
  ["احترام المقدسات", "لا تنشر صورًا محرّمة أو محتوى يسخر من الدين أو الناس أو الشعائر الإسلامية. واختلف بأدب من غير تحزّب أو تنابز."],
  ["احمِ الدائرة", "إذا رأيت محتوى مؤذيًا، افتح قائمة النقاط الثلاث في المنشور واختر الإبلاغ. اختر الفئة الأدق وأرسل التفاصيل الضرورية فقط؛ لا يفتح ذلك بريدك الشخصي."],
];

function PageIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div className="mb-7"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a4822e]">{eyebrow}</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.045em] text-[#163e33] sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#678073]">{body}</p></div>;
}

function Explore() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const results = trpc.social.search.useQuery({ query: submitted || "_" }, { enabled: Boolean(submitted) });
  const blocked = trpc.social.blockedMembers.useQuery(undefined, { enabled: isAuthenticated });
  const follow = trpc.social.toggleFollow.useMutation({ onSuccess: () => { utils.social.search.invalidate(); toast.success("تم تحديث قائمة متابعاتك."); }, onError: error => toast.error(error.message) });
  const block = trpc.social.toggleMemberBlock.useMutation({ onSuccess: () => { utils.social.search.invalidate(); toast.success("تم تحديث قائمة الحظر. لن تُحذف منشورات العضو أو رسائله."); }, onError: error => toast.error(error.message) });
  const unblock = trpc.social.toggleMemberBlock.useMutation({ onSuccess: () => { void utils.social.blockedMembers.invalidate(); void utils.social.search.invalidate(); toast.success("أُلغيَ حظر العضو."); }, onError: error => toast.error(error.message) });
  const search = (event: React.FormEvent) => { event.preventDefault(); setSubmitted(query.trim()); };
  const followPerson = (targetUserId: number) => { if (!isAuthenticated) { toast.info("سجّل الدخول لمتابعة الأعضاء."); window.location.href = "/auth"; return; } follow.mutate({ targetUserId }); };
  const blockPerson = (targetUserId: number) => { if (!isAuthenticated) { toast.info("سجّل الدخول لإدارة قائمة الحظر."); window.location.href = "/auth"; return; } if (window.confirm("هل تريد حظر هذا العضو؟ لن تُحذف منشوراته أو رسائله.")) block.mutate({ blockedId: targetUserId }); };
  return <div dir="rtl" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
    <PageIntro eyebrow="اكتشف بوعي" title="استكشف الدائرة" body="ابحث عن الأعضاء والحوارات النافعة بالاسم أو الكلمة أو الوسم. صُمّم البحث للعمق لا للتوصيات التي لا تنتهي." />
    <form onSubmit={search} className="relative"><Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[#799184]" size={18} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن أشخاص أو منشورات أو #مواضيع" className="h-13 rounded-2xl border-[#d8e2d7] bg-white pr-11 text-sm shadow-sm" /></form>
    <div className="mt-6"><p className="text-xs font-bold tracking-[0.14em] text-[#7b9287]">جرّب موضوعًا</p><div className="mt-3 flex flex-wrap gap-2">{["#seekknowledge", "#mindfulmedia", "#service", "#quranreflection", "#goodcharacter"].map(topic => <button type="button" onClick={() => { setQuery(topic); setSubmitted(topic); }} key={topic} className="rounded-full border border-[#dce6dc] bg-white px-3.5 py-2 text-xs font-bold text-[#346653] transition-colors hover:border-[#a9c6b2] hover:bg-[#ecf4ed]">{topic}</button>)}</div></div>
    {isAuthenticated && <section className="mt-8 rounded-[20px] border border-[#e5e0d2] bg-[#fffdf5] p-4 dark:border-[#3d5148] dark:bg-[#15231f]"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-[0.14em] text-[#8b7540]">خصوصيتك</p><h2 className="mt-1 text-sm font-extrabold text-[#40594d] dark:text-[#dcebe2]">الأعضاء المحظورون</h2></div><ShieldCheck className="text-[#9a7b2c]" size={19} /></div>{blocked.isLoading ? <p className="mt-3 text-xs text-[#82968b]">يجري تجهيز القائمة…</p> : blocked.data?.length ? <div className="mt-3 flex flex-wrap gap-2">{blocked.data.map(person => <div key={person.id} className="flex items-center gap-2 rounded-xl border border-[#eadfc5] bg-white px-3 py-2 dark:border-[#4d5c4a] dark:bg-[#1d2c27]"><span className="max-w-[150px] truncate text-xs font-bold text-[#526b5e] dark:text-[#d4e5db]">{person.name || person.username || "عضو"}</span><Button type="button" variant="outline" onClick={() => unblock.mutate({ blockedId: person.id })} disabled={unblock.isPending} className="h-7 rounded-lg border-[#eadfc5] px-2 text-[10px] text-[#806c38] dark:border-[#8b7440] dark:text-[#e4c878]">إلغاء الحظر</Button></div>)}</div> : <p className="mt-3 text-xs text-[#82968b]">لا توجد حسابات محظورة.</p>}</section>}
    {results.isFetching && <div className="mt-7 flex items-center gap-2 text-sm text-[#6a8377]"><Loader2 className="animate-spin" size={17} />يجري البحث في الدائرة…</div>}
    {submitted && !results.isFetching && <div className="mt-8 space-y-5">
      <section><p className="text-xs font-bold tracking-[0.14em] text-[#7b9287]">الأعضاء</p><div className="mt-3 space-y-3">{results.data?.people?.length ? results.data.people.map(person => <div key={person.id} className="flex items-start justify-between gap-4 rounded-[20px] border border-[#dce5da] bg-white p-4"><div className="flex min-w-0 gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e5efe5] text-xs font-extrabold text-[#176047]">{(person.name || person.username || "د").split(" ").map(part => part[0]).join("").slice(0, 2)}</span><div className="min-w-0"><p className="truncate text-sm font-extrabold text-[#264a3e]">{person.name || person.username || "عضو في الدائرة"}</p>{person.username && <p className="mt-0.5 text-xs text-[#82968b]">@{person.username}</p>}{person.bio && <p className="mt-2 text-xs leading-5 text-[#6b8378]">{person.bio}</p>}{(person.country || person.madhhabPreference) && <p className="mt-2 text-[11px] font-semibold text-[#8a9c92]">{[person.country, person.madhhabPreference].filter(Boolean).join(" · ")}</p>}</div></div><div className="flex shrink-0 flex-col gap-2"><Button onClick={() => followPerson(person.id)} disabled={follow.isPending || block.isPending} className="rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]"><UserPlus size={15} />تابع</Button><Button type="button" variant="outline" onClick={() => blockPerson(person.id)} disabled={block.isPending} className="rounded-xl border-[#e5d8d0] px-3 text-[11px] text-[#8a5b4b]">حظر</Button></div></div>) : <p className="rounded-xl border border-dashed border-[#d4dfd4] px-4 py-5 text-sm text-[#778d82]">لا يوجد أعضاء يطابقون هذا البحث بعد.</p>}</div></section>
      <section><p className="text-xs font-bold tracking-[0.14em] text-[#7b9287]">المنشورات</p><div className="mt-3 space-y-3">{results.data?.posts?.length ? results.data.posts.map(post => <div key={post.id} className="rounded-[20px] border border-[#dce5da] bg-white p-4"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e5efe5] text-[#21684b]"><UsersRound size={14} /></span><p className="text-xs font-bold text-[#46685a]">{post.authorName || post.authorUsername || "عضو في الدائرة"}</p></div><p dir="auto" className="mt-3 text-sm leading-6 text-[#3c5d50]">{post.content}</p>{post.hashtags && <p className="mt-3 text-xs font-bold text-[#34735a]">{post.hashtags}</p>}</div>) : <p className="rounded-xl border border-dashed border-[#d4dfd4] px-4 py-5 text-sm text-[#778d82]">لا توجد منشورات تطابق هذا البحث بعد.</p>}</div></section>
    </div>}
  </div>;
}

function Saved() {
  const { isAuthenticated } = useAuth();
  const saved = trpc.social.savedPosts.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const removeSaved = trpc.social.toggleSavedPost.useMutation({ onSuccess: () => { void utils.social.savedPosts.invalidate(); toast.success("أُزيلَ المنشور من المحفوظات."); }, onError: error => toast.error(error.message) });
  if (!isAuthenticated) return <div dir="rtl" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><PageIntro eyebrow="مساحتك الهادئة" title="المحفوظات" body="احفظ ما تريد الرجوع إليه لاحقاً، من دون أن تتحول الصفحة إلى تمرير لا ينتهي." /><div className="rounded-[24px] border border-dashed border-[#cbd9cd] bg-[#fbfcf8] px-6 py-16 text-center"><Bookmark className="mx-auto text-[#25684d]" size={28} /><h2 className="mt-5 font-display text-xl font-semibold text-[#264b3e]">سجّل الدخول لرؤية محفوظاتك.</h2><Button onClick={() => { window.location.href = "/auth"; }} className="mt-5 rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]">انضم إلى الدائرة</Button></div></div>;
  return <div dir="rtl" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><PageIntro eyebrow="مساحتك الهادئة" title="المحفوظات" body="منشورات اخترت الاحتفاظ بها للقراءة أو المراجعة. تُعرض بترتيب الحفظ، وبحدّ واضح، ولا تُرتَّب وفق الإعجابات." />{saved.isLoading ? <div className="flex items-center gap-2 rounded-[20px] border border-[#dce5da] bg-white p-6 text-sm text-[#6a8377]"><Loader2 className="animate-spin" size={17} />يجري تجهيز محفوظاتك…</div> : saved.data?.length ? <div className="space-y-4">{saved.data.map(post => <article key={post.id} className="rounded-[22px] border border-[#dce5da] bg-white p-5 shadow-[0_8px_24px_rgba(27,66,49,0.035)]"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-[#264a3e]">{post.author.name || post.author.username || "عضو في الدائرة"}</p><p className="mt-1 text-[11px] text-[#81958a]">حُفِظَ في {new Date(post.savedAt).toLocaleDateString("ar")}</p></div><div className="flex items-center gap-2"><Bookmark className="text-[#b58d32]" size={18} /><Button type="button" variant="outline" onClick={() => removeSaved.mutate({ postId: post.id })} disabled={removeSaved.isPending} className="h-8 rounded-lg border-[#dce5da] px-2.5 text-[11px] text-[#617b6e]">إزالة</Button></div></div>{post.title && <h2 className="mt-4 font-display text-lg font-bold text-[#24483d]">{post.title}</h2>}<p dir="auto" className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#3d5e51]">{post.content || "مَنْشُورٌ بِمُرْفَقٍ فقط."}</p></article>)}</div> : <div className="rounded-[24px] border border-dashed border-[#cbd9cd] bg-[#fbfcf8] px-6 py-16 text-center"><Bookmark className="mx-auto text-[#25684d]" size={28} /><h2 className="mt-5 font-display text-xl font-semibold text-[#264b3e]">لا توجد محفوظات بعد.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#778d82]">استخدم زر الحفظ في المنشور عندما تجد شيئاً نافعاً تريد العودة إليه.</p></div>}</div>;
}

function Rules() {
  return <div className="max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10" dir="rtl"><PageIntro eyebrow="أمانة مشتركة" title="قواعد المجتمع" body="هذه القواعد بسيطة عن قصد؛ لتحفظ الثقة والانتباه وكرامة كل من في الدائرة." /><div className="overflow-hidden rounded-[24px] border border-[#dce5da] bg-white">{rules.map(([title, text], index) => <div key={title} className="flex gap-4 border-b border-[#edf1eb] p-5 last:border-0 sm:p-6"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e6f0e5] text-xs font-extrabold text-[#1d674b]">0{index + 1}</span><div><h2 className="text-sm font-extrabold text-[#23483c]">{title}</h2><p className="mt-1.5 text-sm leading-6 text-[#668075]">{text}</p></div></div>)}</div><div className="mt-6 rounded-[20px] border border-[#e0d4aa] bg-[#f8f2df] p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#967726]" size={19} /><p className="text-sm leading-6 text-[#61705c]">عند الإبلاغ عن محتوى، افتح قائمة النقاط الثلاث في منشور عضو آخر واختر <strong>«الإبلاغ عن المنشور»</strong>، ثم اختر الفئة الأدق: <strong>احتيال</strong> أو <strong>كذب</strong> أو <strong>محتوى مُفسد للعقل</strong> أو <strong>صور محرّمة</strong>. يُرسل البلاغ من خادم المنصة إلى المالك، ولا يفتح بريدك الشخصي.</p></div></div><a href="/terms" className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-[#155a40] underline decoration-[#c6a04a] underline-offset-4">اقرأ ميثاق الدائرة وشروط الاستخدام <FileSearch size={16} /></a></div>;
}

function vapidKeyToBuffer(key: string) {
  const padded = `${key}${"=".repeat((4 - (key.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const binary = window.atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0)).buffer;
}

function BrowserPushControl() {
  const status = trpc.social.browserPushStatus.useQuery();
  const save = trpc.social.saveBrowserPushSubscription.useMutation({ onSuccess: () => { status.refetch(); toast.success("تم تفعيل إشعارات المتصفح باختيارك."); }, onError: error => toast.error(error.message) });
  const remove = trpc.social.removeBrowserPushSubscription.useMutation({ onSuccess: () => { status.refetch(); toast.success("تم إيقاف إشعارات المتصفح."); }, onError: error => toast.error(error.message) });
  const [browserSupported, setBrowserSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [browserSubscribed, setBrowserSubscribed] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setBrowserSupported(supported);
    if (!supported) return;
    setPermission(Notification.permission);
    navigator.serviceWorker.register("/sw.js").then(registration => registration.pushManager.getSubscription()).then(subscription => setBrowserSubscribed(Boolean(subscription))).catch(() => setBrowserSubscribed(false));
  }, []);

  const enable = async () => {
    if (!status.data?.publicKey || !browserSupported) return;
    const granted = await Notification.requestPermission();
    setPermission(granted);
    if (granted !== "granted") { toast.error("لم يُسمح بالإشعارات من المتصفح."); return; }
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyToBuffer(status.data.publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("تعذّر تجهيز اشتراك المتصفح.");
      setBrowserSubscribed(true);
      save.mutate({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, userAgent: navigator.userAgent });
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذّر تفعيل إشعارات المتصفح."); }
  };

  const disable = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;
      await subscription?.unsubscribe();
      setBrowserSubscribed(false);
      remove.mutate(endpoint ? { endpoint } : {});
    } catch { remove.mutate({}); }
  };

  if (status.isLoading) return null;
  if (!status.data?.available) return <section className="mb-5 rounded-[20px] border border-[#e4dcc2] bg-[#fbf8ed] p-4"><p className="text-sm font-extrabold text-[#5a5131]">إشعارات المتصفح قيد التهيئة</p><p className="mt-1 text-xs leading-5 text-[#756d55]">ستظهر إمكانية التفعيل هنا بعد تهيئة مفاتيح الإشعارات على الخادم. لا تُفعَّل تلقائيًا.</p></section>;
  if (!browserSupported) return <section className="mb-5 rounded-[20px] border border-[#e4dcc2] bg-[#fbf8ed] p-4"><p className="text-sm font-extrabold text-[#5a5131]">هذا المتصفح لا يدعم إشعارات الويب</p><p className="mt-1 text-xs leading-5 text-[#756d55]">ستبقى إشعاراتك داخل الدائرة متاحة من هذه الصفحة.</p></section>;
  const enabled = browserSubscribed || Boolean(status.data.subscribed);
  return <section className="mb-5 rounded-[20px] border border-[#cfe1d2] bg-[#f3f8f3] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-extrabold text-[#275846]">إشعارات المتصفح</p><p className="mt-1 max-w-xl text-xs leading-5 text-[#5e796b]">اختيارية. تُستخدم للرسائل الخاصة وطلبات الصداقة والإشارات والردود فقط، وليس لزيادة التفاعل.</p></div><Button type="button" onClick={enabled ? disable : enable} disabled={save.isPending || remove.isPending || permission === "denied"} className="shrink-0 rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]">{enabled ? "إيقاف" : permission === "denied" ? "مرفوضة من المتصفح" : "تفعيل"}</Button></div></section>;
}

function Notifications() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const notifications = trpc.social.notifications.useQuery(undefined, { enabled: isAuthenticated });
  const markRead = trpc.social.markNotificationRead.useMutation({ onSuccess: () => utils.social.notifications.invalidate() });
  const deleteNotification = trpc.social.deleteNotification.useMutation({ onSuccess: async () => { await utils.social.notifications.invalidate(); toast.success("حُذِفَ الإشعار."); }, onError: error => toast.error(error.message) });
  if (!isAuthenticated) return <div dir="rtl" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><PageIntro eyebrow="ابقَ على اطلاع" title="الإشعارات" body="ستظهر هنا المتابعات والردود والإشارات المرتبطة بدائرتك." /><div className="rounded-[24px] border border-dashed border-[#cbd9cd] bg-[#fbfcf8] px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5efe5] text-[#25684d]"><Bell size={24} /></span><h2 className="mt-5 font-display text-xl font-semibold text-[#264b3e]">سجّل الدخول لرؤية تحديثاتك.</h2><Button onClick={() => { window.location.href = "/auth"; }} className="mt-5 rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]">انضم إلى الدائرة</Button></div></div>;
  const openNotification = (notification: { id: number; type: string; postId: number | null; readAt: Date | null }) => { if (!notification.readAt) markRead.mutate({ notificationId: notification.id }); window.location.href = notification.type === "friend_request" ? "/profile" : notification.type === "message" ? "/chat" : notification.postId ? "/" : "/notifications"; };
  return <div dir="rtl" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10"><PageIntro eyebrow="اِبْقَ على اطّلاع" title="الإشعارات" body="سترى النشاط المرتبط بك مباشرة، من دون تنبيهات مصطنعة تدفعك للبقاء." /><BrowserPushControl />{notifications.isLoading ? <div className="flex items-center gap-2 text-sm text-[#6c8579]"><Loader2 className="animate-spin" size={17} />يَجري تحميل الإشعارات…</div> : notifications.data?.length ? <div className="overflow-hidden rounded-[24px] border border-[#dce5da] bg-white">{notifications.data.map(({ notification, actorName, actorUsername }) => <div key={notification.id} className={`flex items-start gap-3 border-b border-[#edf1eb] p-5 text-right last:border-0 ${notification.readAt ? "bg-white" : "bg-[#f5faf5]"}`}><button type="button" onClick={() => openNotification(notification)} className="flex min-w-0 flex-1 items-start gap-3 text-right"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-[#e5efe5] text-xs font-extrabold text-[#176047]">{(actorName || actorUsername || "د").split(" ").map(part => part[0]).join("").slice(0, 2)}</span><span className="min-w-0 flex-1"><span className="block text-sm leading-6 text-[#335548]"><strong>{actorName || actorUsername || "عُضْوٌ في الدَّائِرَة"}</strong> {notification.message}</span><span className="mt-1 block text-[11px] font-semibold text-[#81978b]">{new Date(notification.createdAt).toLocaleString("ar")}</span></span>{!notification.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#c29b42]" />}</button><button type="button" onClick={() => deleteNotification.mutate({ notificationId: notification.id })} disabled={deleteNotification.isPending} className="rounded-lg p-2 text-[#9e6a59] hover:bg-[#fff0ee] hover:text-[#a24937]" aria-label="حَذْفُ الإشعار"><Trash2 size={16} /></button></div>)}</div> : <div className="rounded-[24px] border border-dashed border-[#cbd9cd] bg-[#fbfcf8] px-6 py-16 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e5efe5] text-[#25684d]"><Bell size={24} /></span><h2 className="mt-5 font-display text-xl font-semibold text-[#264b3e]">مَساحَتُكَ هادِئَةٌ الآن.</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#748a7f]">ستظهر الإشعارات للمتابعين الجدد والإعجابات والتعليقات وإعادة النشر والإشارات.</p></div>}</div>;
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
  const avatarInput = useRef<HTMLInputElement>(null);
  const uploadAvatar = trpc.social.uploadAvatar.useMutation({
    onSuccess: async stored => {
      await update.mutateAsync({ avatarUrl: stored.url });
      await utils.social.myProfile.invalidate();
      toast.success("تم حفظ الصورة الشخصية.");
    },
    onError: error => toast.error(error.message),
  });

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
  const chooseAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("اختر صورة فقط للملف الشخصي."); return; }
    if (file.size > 6_000_000) { toast.error("الصورة الشخصية يجب ألا تتجاوز 6 ميغابايت."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataBase64 = String(reader.result || "").split(",")[1];
      if (!dataBase64) { toast.error("تعذّرت قراءة الصورة."); return; }
      uploadAvatar.mutate({ filename: file.name, mimeType: file.type, dataBase64 });
    };
    reader.onerror = () => toast.error("تعذّرت قراءة الصورة.");
    reader.readAsDataURL(file);
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
          <div className="rounded-xl border border-[#dce8dc] bg-[#f8fbf7] p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-[#496a5c]">الصورة الشخصية</p><p className="mt-1 text-xs leading-5 text-[#5a766a]">ارفع صورة مباشرة من جهازك. لا تحتاج إلى رابط.</p></div><input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={chooseAvatar} /><Button type="button" variant="outline" onClick={() => avatarInput.current?.click()} disabled={uploadAvatar.isPending || update.isPending} className="rounded-xl border-[#b9d2be] bg-white text-xs text-[#155a40] hover:bg-[#edf7ee]">{uploadAvatar.isPending ? <Loader2 className="animate-spin" size={14} /> : <ImageUp size={14} />}رفع صورة</Button></div></div>
          <div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-xs font-bold text-[#496a5c]">البلد<Input value={country} onChange={event => setCountry(event.target.value)} placeholder="اختياري" className="h-10 rounded-xl border-[#dbe5dc] text-sm font-normal" /></label><label className="grid gap-2 text-xs font-bold text-[#496a5c]">التوجه المذهبي<Input value={madhhab} onChange={event => setMadhhab(event.target.value)} placeholder="اختياري — يُعرض باحترام" className="h-10 rounded-xl border-[#dbe5dc] text-sm font-normal" /></label></div>
          <Button onClick={save} disabled={update.isPending} className="w-fit rounded-xl bg-[#0d4937] text-xs hover:bg-[#176047]">{update.isPending && <Loader2 className="animate-spin" size={14} />}حفظ الملف</Button>
        </div>
      </section>
    </div>
  </div>;
}

export default function PlatformPage({ kind }: { kind: PageKind }) {
  const [location] = useLocation();
  const page = kind === "explore" ? <Explore /> : kind === "saved" ? <Saved /> : kind === "notifications" ? <Notifications /> : kind === "profile" ? <><Profile /><FriendPrivacyPanel /></> : <Rules />;
  return <PlatformShell key={location}>{page}</PlatformShell>;
}
