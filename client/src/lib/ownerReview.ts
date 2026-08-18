const OWNER_REPORT_EMAIL = "ssbmbwuugame@gmail.com";

export function ownerReviewMailto(postId: number, title?: string | null) {
  const subject = "طلب مراجعة منشور في دائرة الأمة";
  const body = [
    `أطلب مراجعة منشوري رقم ${postId}.`,
    `العنوان: ${title?.trim() || "دون عنوان"}`,
    "",
    "الرجاء مراجعة القرار بشريًّا.",
  ].join("\n");
  return `mailto:${OWNER_REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
