const OWNER_REPORT_EMAIL = "ssbmbwuugame@gmail.com";

type PostReportEmail = {
  reportId: number;
  postId: number;
  reporterId: number;
  reporterName?: string | null;
  category: "scam" | "lie" | "brainrot" | "haram imagery";
  details?: string | null;
};

const categoryLabels: Record<PostReportEmail["category"], string> = {
  scam: "احتيال",
  lie: "كذب",
  brainrot: "محتوى مُفسد للعقل",
  "haram imagery": "صور محرَّمة",
};

export async function sendPostReportEmail(report: PostReportEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("لم يُضبط مفتاح إرسال البلاغات في الخادم.");

  const from = process.env.RESEND_FROM_EMAIL || "دائرة الأمة <onboarding@resend.dev>";
  const reporter = report.reporterName?.trim() || `عضو #${report.reporterId}`;
  const text = [
    "ورد بلاغ جديد من دائرة الأمة.",
    "",
    `رقم البلاغ: ${report.reportId}`,
    `رقم المنشور: ${report.postId}`,
    `المبلِّغ: ${reporter} (المعرّف ${report.reporterId})`,
    `التصنيف: ${categoryLabels[report.category]}`,
    "",
    "تفاصيل العضو:",
    report.details?.trim() || "لم يضف العضو تفاصيل إضافية.",
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [OWNER_REPORT_EMAIL], subject: `بلاغ جديد عن منشور #${report.postId} — دائرة الأمة`, text }),
  });

  if (!response.ok) {
    console.error("[Report email] Resend delivery failed", response.status, await response.text());
    throw new Error("تعذّر تسليم البلاغ إلى بريد المالك.");
  }

  const payload = await response.json() as { id?: string };
  return { emailId: payload.id ?? null };
}
