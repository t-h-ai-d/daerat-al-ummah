import PlatformShell from "@/components/PlatformShell";
import { AlertTriangle, CheckCircle2, ChevronLeft, FileText, LockKeyhole, MessageSquareText, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Link } from "wouter";

const sections = [
  {
    icon: UserRoundCheck,
    title: "١. نطاق هذه السياسة وهوية المجتمع",
    body: "دائرة الأمة مساحة تواصل للمسلمين من أهل السُّنّة والجماعة. تشرح هذه السياسة كيف نتعامل مع البيانات عند إنشاء الحساب واستخدام المنشورات والرسائل والتبليغات. استعمال المنصة يعني الاطلاع على هذه السياسة وقواعد الدائرة والالتزام بهما.",
  },
  {
    icon: FileText,
    title: "٢. البيانات التي نجمعها",
    body: "نجمع الحد الأدنى اللازم لتشغيل الحساب: البريد الإلكتروني، اسم المستخدم، كلمة مرور محفوظة بصيغة مُشفَّرة لا بنص واضح، وبيانات الجلسة. ويمكنك اختيارياً إضافة الاسم أو النبذة أو الصورة أو البلد أو المذهب الفقهي. لا يُستعمل البلد أو المذهب لترتيب الأعضاء أو تقييد المشاركة أو التحيّز بينهم.",
  },
  {
    icon: MessageSquareText,
    title: "٣. المنشورات والملفات والرسائل الخاصة",
    body: "المحتوى الذي تنشره في الخلاصة، مثل النصوص والصور والفيديوهات والروابط والملفات والتعليقات، يظهر وفق إعدادات النشر داخل الدائرة. الرسائل الخاصة لا تظهر للعامة، لكن الخدمة تعالجها وتخزنها لتوصيلها إلى أطراف المحادثة وحماية المنصة. لا تقدّم المنصة حالياً وعداً بالتشفير التام بين الطرفين، لذا لا ترسل أسراراً شديدة الحساسية أو بيانات مالية أو وثائق هوية عبر الرسائل.",
  },
  {
    icon: ShieldCheck,
    title: "٤. الأمان والحماية التقنية",
    body: "نستخدم كلمات مرور مُشفَّرة وجلسات موقّعة وضوابط صلاحيات لحماية الحسابات، ونقيّد أدوات الإشراف بالمشرفين المخوّلين. كما تُحفظ مراجع المرفقات في تخزين مخصص للخدمة. رغم ذلك، لا توجد خدمة رقمية خالية تماماً من المخاطر؛ احمِ كلمة مرورك ولا تشارك رمز الجلسة أو بيانات الدخول مع أحد.",
  },
  {
    icon: AlertTriangle,
    title: "٥. البلاغات والإشراف",
    body: "عند الإبلاغ عن محتوى تحت تصنيفات الاحتيال أو الكذب أو المحتوى المُفسِد للعقل أو الصور المحرمة، تُرسل بيانات البلاغ والمحتوى المرتبط به إلى فريق الإشراف للمراجعة. قد ينتج عن ذلك تنبيه أو إزالة محتوى أو تقييد أو حظر عند تكرار المخالفة. لا تُستخدم البلاغات للتشهير أو الانتقام، ويجب تقديمها بصدق وبقدر الحاجة.",
  },
  {
    icon: LockKeyhole,
    title: "٦. الإشعارات والإشارات",
    body: "ننشئ إشعارات عند المتابعة والإعجاب والتعليق وإعادة النشر والإشارة باسم المستخدم وتحديثات الإشراف. الغرض منها إبلاغك بالنشاط المرتبط بك، لا دفعك إلى التمرير القهري أو جمع التفاعل. يمكنك ببساطة تقليل استخدامك أو مراجعة الإشعارات على فترات تناسبك.",
  },
  {
    icon: CheckCircle2,
    title: "٧. الأساس السُّنّي واحترام المذاهب",
    body: "المنصة مخصصة لمجتمع سُنّي وتستمد معيارها من الأدب والصدق وحفظ الكرامة. نرحب بالاختلاف الفقهي المعتبر بين المذاهب السُّنّية عند عرضه بعلم وأدب. يُمنع التكفير والسبّ والتحريض والازدراء المذهبي واستعمال الدين لإيذاء الناس أو استهدافهم.",
  },
  {
    icon: UserRoundCheck,
    title: "٨. حقوقك واختياراتك",
    body: "يمكنك تعديل ملفك وحذف محتواك الذي تملكه، واستخدام أدوات التبليغ، وطلب المساعدة من إدارة المنصة بشأن الحساب أو الخصوصية عند توافر قناة التواصل. قد نحتفظ بسجل محدود مما يلزم للأمان أو منع الاحتيال أو تنفيذ قرارات الإشراف، حتى بعد حذف المحتوى، ضمن ما تقتضيه حماية المجتمع.",
  },
];

const principles = [
  ["لا نبيع بيانات الأعضاء", "لا تُبنى المنصة على الإعلانات السلوكية أو بيع البيانات الشخصية."],
  ["لا توصيات لاستنزاف الانتباه", "الخلاصة محدودة وتحت تحكم العضو، دون تمرير لا نهائي أو تشغيل تلقائي."],
  ["لا تحيّز مذهبي", "بيان المذهب اختياري، ويُعرض باحترام ولا يرفع أو يخفض مكانة أي عضو."],
];

export default function PrivacyPage() {
  return (
    <PlatformShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12" dir="rtl" lang="ar">
        <section className="relative overflow-hidden rounded-[30px] border border-[#1d5947]/15 bg-[#0d3b31] px-6 py-9 text-[#f7f8ee] shadow-[0_22px_55px_rgba(13,59,49,0.17)] sm:px-10 sm:py-12">
          <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full border border-[#d7b961]/20" />
          <div className="absolute -bottom-24 left-24 h-52 w-52 rounded-full border border-[#d7b961]/15" />
          <div className="relative max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#e4c76b]/25 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#ead57d]"><ShieldCheck size={15} /> الخصوصية والأمانة</span>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-[-0.045em] sm:text-5xl">سياسة الخصوصية<br />لدائرة الأمة</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#d2e0d4] sm:text-base">وثيقة واضحة تشرح ما نحتفظ به، ولماذا نحتاجه، وكيف نحمي كرامة الأعضاء وبياناتهم داخل مجتمع سُنّي يقوم على الأمانة والأدب.</p>
            <p className="mt-5 text-xs font-bold tracking-wide text-[#e5c96d]">آخر تحديث: ١٧ أغسطس ٢٠٢٦</p>
          </div>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-3">
          {principles.map(([title, text]) => (
            <article key={title} className="rounded-2xl border border-[#dce5d9] bg-white p-5 shadow-[0_8px_22px_rgba(29,61,48,0.04)]">
              <CheckCircle2 className="text-[#b08c36]" size={19} />
              <h2 className="mt-3 text-base font-extrabold text-[#174337]">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#667e73]">{text}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[26px] border border-[#dce5d9] bg-[#fbfcf8] p-5 sm:p-8">
          <div className="mb-7 flex items-start gap-3 border-b border-[#e3e9df] pb-6">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e7efe5] text-[#0f503c]"><FileText size={21} /></span>
            <div><h2 className="text-2xl font-extrabold text-[#123f32]">التفاصيل الكاملة</h2><p className="mt-1 text-sm leading-6 text-[#6c8277]">نكتبها بلغة مباشرة، بلا وعود غامضة ولا تصميم يضغط عليك لتقبل أكثر مما يلزم.</p></div>
          </div>
          <div className="space-y-7">
            {sections.map(({ icon: Icon, title, body }) => (
              <article key={title} className="border-b border-[#e6ebe2] pb-7 last:border-0 last:pb-0">
                <div className="flex items-center gap-2.5"><Icon size={18} className="text-[#ad8830]" /><h3 className="text-lg font-extrabold text-[#174437]">{title}</h3></div>
                <p className="mt-3 pr-7 text-[15px] leading-8 text-[#516c60]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-7 rounded-[26px] border border-[#dfcf94] bg-[#fff9e7] p-6 sm:p-8">
          <h2 className="text-xl font-extrabold text-[#554614]">تغييرات هذه السياسة</h2>
          <p className="mt-3 text-sm leading-7 text-[#74652d]">إذا غيّرنا طريقة جمع البيانات أو استخدامها بشكل جوهري، سنحدّث تاريخ هذه الصفحة ونوضح التغيير في مكان ظاهر داخل الدائرة. استمرار الاستخدام بعد نشر التحديث يعني الاطلاع على النسخة الجديدة.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/rules" className="inline-flex items-center gap-1.5 rounded-xl bg-[#0d3b31] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#175443]">قواعد الدائرة <ChevronLeft size={16} /></Link>
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8c57d] bg-white px-4 py-2.5 text-sm font-bold text-[#4f6424] transition-colors hover:bg-[#fffdf5]">العودة للرئيسية</Link>
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}
