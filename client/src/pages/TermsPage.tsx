import PlatformShell from "@/components/PlatformShell";
import { ExternalLink, FileText, Flag, ShieldCheck } from "lucide-react";

const ethics = [
  {
    number: "01",
    title: "الصِّدْقُ وَالتَّثَبُّتُ",
    body: "لا تَنْشُر خَبَرًا، أو اتِّهامًا، أو اقتباسًا مُجتَزَأً قبل التَّثبُّت. إذا لم تَعْرِف، فقُل: لا أَعْلَم. وتَراجَع عند الخطأ بدل نَشْرِه أو تَكرارِه.",
    sources: [["الحُجُرات 49:6", "https://quran.com/49/6"], ["الأحزاب 33:70", "https://quran.com/33/70"]],
  },
  {
    number: "02",
    title: "الكَلِمَةُ النّافِعَةُ وَالأَدَبُ",
    body: "اكتب ما فيه خَيْرٌ أو فائدة أو حُجَّة مؤدَّبة. يُمْنَع السَّبّ، والتَّشهير، والسُّخرية، والإِغراق، وصناعة الغضب أو الإدمان لأجل الانتشار.",
    sources: [["صحيح مسلم 47a", "https://sunnah.com/muslim:47"]],
  },
  {
    number: "03",
    title: "النُّصْحُ وَحِفْظُ الحُقوقِ",
    body: "انصح بلُطْفٍ وبقصد الإصلاح، ولا تَسْتَغِل خصوصية الناس، أو أموالهم، أو ثقتهم. لا احتيال، ولا كذب، ولا انتحال، ولا وعود زائفة.",
    sources: [["صحيح مسلم 55a", "https://sunnah.com/muslim:55"]],
  },
  {
    number: "04",
    title: "حُرْمَةُ الدِّينِ وَكَرَامَةُ النّاسِ",
    body: "احترم القرآن والسُّنَّة، ولا تنشر صورًا أو محتوى محرَّمًا أو مُهينًا، ولا تجعل الخلاف المذهبي أو الشخصي بابًا للاتهام أو الإيذاء. اختلاف الرأي يُناقَش بأدبٍ ومن غير تَكْفير أو تحريض.",
    sources: [["الحُجُرات 49:11–12", "https://quran.com/49/11-12"]],
  },
] as const;

export default function TermsPage() {
  return <PlatformShell><main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
    <section className="overflow-hidden rounded-[28px] border border-[#cfe0d2] bg-[#0d4937] px-6 py-8 text-white shadow-[0_20px_50px_rgba(13,59,49,0.14)] sm:px-8">
      <p className="text-xs font-extrabold tracking-[0.18em] text-[#e6c96e]">شُروطُ الاِسْتِخْدامِ</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">مِيثاقُ الدَّائِرَةِ الأَخْلاقِيُّ</h1>
      <p className="mt-4 max-w-2xl text-sm leading-8 text-[#d8e7dd]">دائرةُ الأُمَّةِ مساحةٌ سُنِّيَّةٌ هادئة. نَسْتَلهم من القرآن والسُّنَّة أصولًا للسلوك الرقمي: الصِّدق، والتَّثبُّت، والكلمة النافعة، والنُّصح، وحفظ كرامة الناس.</p>
    </section>

    <section className="mt-6 rounded-[24px] border border-[#e2d6ad] bg-[#faf5e5] p-5 sm:p-6">
      <div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#967726]" size={21} /><div><h2 className="font-display text-xl font-semibold text-[#5c522f]">حَدُّ هذا الميثاق</h2><p className="mt-2 text-sm leading-7 text-[#6d6548]">هذا تلخيصٌ مجتمعيٌّ لأخلاق المشاركة، وليس فتوى، ولا تفسيرًا شاملًا، ولا بديلًا عن سؤال أهل العلم المؤهلين. لا تستخدم المنصة أو نظامها الآلي لإصدار حُكْمٍ شرعيٍّ على شخصٍ بعينه.</p></div></div>
    </section>

    <section className="mt-6 overflow-hidden rounded-[24px] border border-[#dce5da] bg-white">
      {ethics.map(item => <article key={item.number} className="flex gap-4 border-b border-[#edf1eb] p-5 last:border-0 sm:p-6"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e6f0e5] text-xs font-extrabold text-[#176047]">{item.number}</span><div className="min-w-0"><h2 className="font-display text-xl font-semibold text-[#24483d]">{item.title}</h2><p className="mt-2 text-sm leading-7 text-[#668075]">{item.body}</p><div className="mt-3 flex flex-wrap gap-2">{item.sources.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-[#f2f6f0] px-2.5 py-1.5 text-xs font-bold text-[#176047] hover:bg-[#e5efe5]">{label}<ExternalLink size={12} /></a>)}</div></div></article>)}
    </section>

    <section className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-[22px] border border-[#dce5da] bg-white p-5"><FileText className="text-[#176047]" size={20} /><h2 className="mt-3 font-display text-xl font-semibold text-[#24483d]">تطبيق الشروط</h2><p className="mt-2 text-sm leading-7 text-[#668075]">باستعمالك الدائرة، تلتزم بهذه الشروط وقواعد المجتمع وسياسة الخصوصية. يُمكن للمنصة إيقاف نشر المحتوى المُشتبه به لحين مراجعة بشرية، لكن الآلة لا تُصدر فتوى ولا عقوبة نهائية من تلقاء نفسها.</p></div><div className="rounded-[22px] border border-[#e2d6ad] bg-[#faf5e5] p-5"><Flag className="text-[#967726]" size={20} /><h2 className="mt-3 font-display text-xl font-semibold text-[#5c522f]">البلاغات</h2><p className="mt-2 text-sm leading-7 text-[#746b4c]">للإبلاغ عن احتيال أو كذب أو محتوى مُفسد للعقل أو صور محرمة، افتح قائمة النقاط الثلاث في منشور عضو آخر واختر «الإبلاغ عن المنشور». يرسل الخادم البلاغ إلى مالك المنصة ولا يفتح بريدك الشخصي.</p><p className="mt-3 text-xs font-extrabold text-[#155a40]">أرسل الضروري فقط وبصدق، ولا تستخدم البلاغ للإساءة أو الانتقام.</p></div></section>
  </main></PlatformShell>;
}
