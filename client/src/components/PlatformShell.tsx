import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  BookOpen,
  Compass,
  Home,
  Menu,
  MessageCircleMore,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";

type NavItem = { label: string; href: string; icon: typeof Home };

const primaryNav: NavItem[] = [
  { label: "الرئيسية", href: "/", icon: Home },
  { label: "استكشاف", href: "/explore", icon: Compass },
  { label: "الرسائل", href: "/chat", icon: MessageCircleMore },
  { label: "الإشعارات", href: "/notifications", icon: Bell },
  { label: "قواعد الدائرة", href: "/rules", icon: BookOpen },
];

const arabicLabels: Record<string, string> = {
  "The circle standard": "معيار الدائرة",
  "Speak truthfully and cite what you share.": "تكلّم بصدق وتثبّت مما تشارك.",
  "Protect people from scams and manipulation.": "احمِ الناس من الاحتيال والتلاعب.",
  "Choose beneficial content over endless reactions.": "اختر المحتوى النافع بدل التفاعل المرهق.",
  "Treat Islamic identities with dignity and without bias.": "احترم الهويات الإسلامية بكرامة ومن دون تحيّز.",
  "Today’s intention": "نية اليوم",
  "Benefit over vanity. Presence over pressure.": "النفع قبل المظاهر. الحضور بلا ضغط.",
  "Use your feed with intention: learn, contribute, and reconnect.": "استخدم خلاصتك بنية: تعلّم، ساهم، وتواصل.",
  "Discover with intention": "استكشف بنية طيبة",
  "Explore the circle": "استكشف الدائرة",
  "Community rules": "قواعد الدائرة",
  "A shared amanah": "أمانة مشتركة",
  "Truth is a trust": "الصدق أمانة",
  "No scams or exploitation": "لا احتيال ولا استغلال",
  "No brainrot": "لا محتوى مُفسِد للعقل",
  "Respect the sacred": "احترام المقدسات",
  "Protect the circle": "احمِ الدائرة",
  "Stay in the loop": "ابقَ على اطلاع",
  "Notifications": "الإشعارات",
  "Profile & identity": "الملف الشخصي والهوية",
  "Your place in the circle": "مكانك في الدائرة",
  "Moderator workspace": "مساحة المشرف",
  "Guard the circle": "حماية الدائرة",
  "Bio": "نبذة",
  "Username": "اسم المستخدم",
  "Country": "البلد",
  "Madhhab preference": "المذهب المفضّل",
  "Save profile": "حفظ الملف",
  "Follow": "متابعة",
  "People": "الأشخاص",
  "Posts": "المنشورات",
  "Searching the circle…": "يجري البحث في الدائرة…",
  "Find people and useful conversations by name, keyword, or hashtag. Search is designed for depth, not endless recommendations.": "ابحث عن الأشخاص والحوارات النافعة بالاسم أو الكلمة أو الوسم. صُمّم البحث للعمق لا للتوصيات اللانهائية.",
  "Search people, posts, or #topics": "ابحث عن أشخاص أو منشورات أو #مواضيع",
  "Try a topic": "جرّب موضوعاً",
  "No people matched this search yet.": "لا يوجد أشخاص مطابقون لهذا البحث بعد.",
  "No posts matched this search yet.": "لا توجد منشورات مطابقة لهذا البحث بعد.",
  "Circle member": "عضو في الدائرة",
  "These are simple on purpose. They protect trust, attention, and the dignity of everyone in the circle.": "هذه القواعد بسيطة عن قصد؛ فهي تحمي الثقة والانتباه وكرامة كل من في الدائرة.",
  "Do not knowingly share lies, misleading claims, impersonation, or manipulated material. If you are uncertain, say so and seek reliable sources.": "لا تشارك عن علم كذباً أو ادعاءات مضللة أو انتحالاً أو مادة محرّفة. إن لم تكن متأكداً فاذكر ذلك وابحث عن مصادر موثوقة.",
  "Do not solicit money, credentials, private details, or engagement through deception, pressure, or false promises.": "لا تطلب المال أو بيانات الدخول أو التفاصيل الخاصة أو التفاعل بالخداع أو الضغط أو الوعود الكاذبة.",
  "Avoid empty outrage, compulsive-scroll bait, degrading trends, and content designed to drain attention without benefit.": "تجنب الاستفزاز الفارغ وطُعم التمرير القهري والاتجاهات المبتذلة والمحتوى المصمم لاستنزاف الانتباه بلا نفع.",
  "Do not post haram imagery or content that mocks faith, people, or Islamic practices. Disagree with adab and without sectarian bias.": "لا تنشر صوراً محرمة أو محتوى يسخر من الدين أو الناس أو الممارسات الإسلامية. اختلف بأدب ومن دون تحيز مذهبي.",
  "Report harmful content accurately. Moderators review reports fairly and may issue warnings, remove content, or ban repeat offenders.": "بلّغ عن المحتوى الضار بدقة. يراجع المشرفون البلاغات بعدل وقد يوجّهون إنذارات أو يزيلون المحتوى أو يحظرون المكررين.",
  "Follow activity, thoughtful replies, mentions, and moderation updates will appear here.": "ستظهر هنا المتابعات والردود النافعة والإشارات وتحديثات الإشراف.",
  "You will only see activity directly connected to your circle, without artificial engagement prompts.": "لن ترى هنا إلا النشاط المتصل بدائرتك مباشرةً، من دون حوافز تفاعل مصطنعة.",
  "Your space is calm for now.": "مساحتك هادئة الآن.",
  "Notifications will appear for new followers, likes, comments, reposts, mentions, and moderation updates.": "ستظهر الإشعارات للمتابعين الجدد والإعجابات والتعليقات وإعادة النشر والإشارات وتحديثات الإشراف.",
  "Your country and madhhab preference are optional personal fields. They are shown with respect and never used to rank people or limit participation.": "البلد والمذهب المفضّل حقول شخصية اختيارية. تُعرض باحترام ولا تُستخدم مطلقاً لترتيب الأعضاء أو تقييد مشاركتهم.",
  "Your profile has been saved.": "تم حفظ ملفك الشخصي.",
  "Share a little about the benefit you hope to bring.": "شارك نبذة عن النفع الذي تأمل تقديمه.",
  "Optional — letters, numbers, underscores": "اختياري — أحرف أو أرقام أو شرطات سفلية",
  "Avatar image URL": "رابط صورة الملف",
  "Optional": "اختياري",
  "Optional — presented without bias": "اختياري — يُعرض دون تحيّز",
  "This workspace is restricted to authorised administrators.": "هذه المساحة مخصّصة للمشرفين المخوّلين فقط.",
  "Moderator access required.": "يلزم صلاحية المشرف.",
  "The report queue, warnings, post removal, and bans are only available to administrators.": "قائمة البلاغات والإنذارات وإزالة المنشورات والحظر متاحة للمشرفين فقط.",
  "A clear space, ready for benefit.": "مساحة هادئة، جاهزة للنفع.",
  "There are no posts in this view yet. Share a useful thought or choose another intentional view.": "لا توجد منشورات في هذه الخلاصة بعد. شارك فكرة نافعة أو اختر خلاصة أخرى.",
  "You are caught up. Step away when you are ready — the circle will still be here.": "وصلت إلى نهاية الخلاصة. خذ وقتك؛ الدائرة ستبقى هنا.",
  "Review reports carefully, apply proportionate actions, and keep a clear accountability record.": "راجع البلاغات بعناية، واتخذ إجراءات متناسبة، وحافظ على سجل واضح للمساءلة.",
  "Open reports": "البلاغات المفتوحة",
  "Actions available": "الإجراءات المتاحة",
  "Account status": "حالة الحساب",
  "Admin": "مشرف",
  "Ummah Circle": "دائرة الأمة",
  "“Benefit over vanity. Presence over pressure.”": "«النفع قبل المظاهر، والحضور بلا ضغط.»",
  "Benefit over vanity. Presence": "النفع قبل المظاهر، الحضور",
  "over pressure.": "بلا ضغط.",
  "Your Ummah Circle account": "حسابك في دائرة الأمة",
  "Respect-first identity": "هوية قائمة على الاحترام",
  "#seekknowledge": "#اطلب_العلم",
  "#mindfulmedia": "#إعلام_واعٍ",
  "#service": "#خدمة",
  "#quranreflection": "#تدبر_القرآن",
  "#goodcharacter": "#حسن_الخلق",
};

function translateStaticLabels() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach(node => {
    const label = node.nodeValue?.trim();
    if (label && arabicLabels[label]) node.nodeValue = node.nodeValue?.replace(label, arabicLabels[label]) ?? node.nodeValue;
  });
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder], textarea[placeholder]").forEach(field => {
    if (arabicLabels[field.placeholder]) field.placeholder = arabicLabels[field.placeholder];
  });
}

function initials(value?: string | null) {
  return (value || "UC")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

export default function PlatformShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    translateStaticLabels();
    const observer = new MutationObserver(translateStaticLabels);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const navigate = (href: string) => {
    setLocation(href);
    setMobileOpen(false);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) navigate(`/explore?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-[#f5f5ef] text-[#16352d]">
      <header className="sticky top-0 z-40 border-b border-[#dce1d5]/90 bg-[#f9faf6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[73px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/")}
            className="group flex shrink-0 items-center gap-2.5 text-right"
            aria-label="الانتقال إلى الرئيسية"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0d3b31] text-[#d9b85b] shadow-[0_8px_20px_rgba(13,59,49,0.18)] transition-transform duration-200 group-hover:-rotate-6">
              <Sparkles size={19} strokeWidth={2.3} />
            </span>
            <span className="hidden leading-none sm:block">
              <span className="block font-display text-[19px] font-bold tracking-[-0.045em] text-[#11372d]">Ummah Circle</span>
              <span className="mt-1 block text-[10px] font-bold tracking-[0.19em] text-[#9e7d2c]">تواصَل بأدب</span>
            </span>
          </button>

          <form onSubmit={submitSearch} className="mx-auto hidden w-full max-w-[410px] md:block">
            <label className="relative block">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#80968b]" size={17} />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="ابحث في الدائرة"
                className="h-10 rounded-xl border-[#dce3d8] bg-white pr-10 pl-3 text-right text-sm shadow-none placeholder:text-[#90a196] focus-visible:border-[#557c6b] focus-visible:ring-[#557c6b]/20"
              />
            </label>
          </form>

          <div className="ml-auto flex items-center gap-2">
            {isAuthenticated ? (
              <button
                onClick={() => navigate("/profile")}
                className="hidden items-center gap-2 rounded-xl p-1.5 pl-3 text-right transition-colors hover:bg-[#eaf0e9] sm:flex"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e2c56b] text-xs font-extrabold text-[#173b32]">
                  {initials(user?.name)}
                </span>
                <span className="max-w-28 truncate text-xs font-bold text-[#294a40]">{user?.name || "ملفي الشخصي"}</span>
              </button>
            ) : !loading ? (
              <Button onClick={() => navigate("/auth")} className="hidden h-10 rounded-xl bg-[#0d3b31] px-4 text-xs font-bold shadow-none hover:bg-[#175443] sm:inline-flex">
                انضم إلى الدائرة
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(value => !value)}
              className="h-10 w-10 rounded-xl text-[#234a3d] hover:bg-[#e7eee6] md:hidden"
                aria-label="فتح أو إغلاق القائمة"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </Button>
          </div>
        </div>
        {mobileOpen && (
          <div className="border-t border-[#e1e6dc] bg-[#fbfcf8] px-4 py-3 md:hidden">
            <form onSubmit={submitSearch} className="mb-3">
              <label className="relative block">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#80968b]" size={16} />
                <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث عن أعضاء أو منشورات أو #موضوع" className="h-10 rounded-xl bg-white pr-10 text-right" />
              </label>
            </form>
            <nav className="grid grid-cols-2 gap-1">
              {primaryNav.map(item => {
                const Icon = item.icon;
                const active = location === item.href;
                return (
                  <button key={item.href} onClick={() => navigate(item.href)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? "bg-[#e9f0e9] text-[#0f4a3a]" : "text-[#557367]"}`}>
                    <Icon size={17} /> {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-[248px] shrink-0 border-r border-[#dfe5da] px-5 py-7 lg:block">
          <nav className="space-y-1">
            {primaryNav.map(item => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-[14px] font-semibold transition-all ${active ? "bg-[#dfece2] text-[#0c4c39] shadow-[inset_-3px_0_0_#c9a44e]" : "text-[#567568] hover:bg-white hover:text-[#193e34]"}`}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-8 rounded-2xl border border-[#dbe4d8] bg-[linear-gradient(145deg,#edf3ec,#f9f8ec)] p-4">
            <span className="mb-3 grid h-8 w-8 place-items-center rounded-lg bg-[#c59e43] text-[#14392f]"><ShieldCheck size={17} /></span>
            <p className="text-sm font-bold text-[#24483d]">مساحة أكثر أماناً بالتصميم.</p>
            <p className="mt-1.5 text-xs leading-5 text-[#688176]">لا احتيال. لا كذب. لا محتوى مُشتّت. احترم كرامة الناس والدين.</p>
            <button onClick={() => navigate("/rules")} className="mt-3 text-xs font-extrabold text-[#0f5a43] underline decoration-[#c6a04a] underline-offset-4">اقرأ القواعد</button>
          </div>
          <button onClick={() => navigate("/admin")} className="mt-5 flex items-center gap-2 px-3 text-xs font-semibold text-[#84988e] transition-colors hover:text-[#255444]">
            <ShieldCheck size={15} /> مساحة المشرف
          </button>
        </aside>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[67px] border-t border-[#dfe5da] bg-[#fbfcf8]/95 px-3 pb-[max(0px,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        {primaryNav.slice(0, 4).map(item => {
          const Icon = item.icon;
          const active = location === item.href;
          return (
            <button key={item.href} onClick={() => navigate(item.href)} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold ${active ? "text-[#0a4d38]" : "text-[#809288]"}`}>
              <Icon size={19} strokeWidth={active ? 2.5 : 1.8} />
              <span>{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
        <button onClick={() => navigate("/profile")} className={`flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-bold ${location === "/profile" ? "text-[#0a4d38]" : "text-[#809288]"}`}>
          <UserRound size={19} strokeWidth={location === "/profile" ? 2.5 : 1.8} />
          <span>ملفي</span>
        </button>
      </nav>
    </div>
  );
}
