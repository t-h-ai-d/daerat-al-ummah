import { describe, expect, it } from "vitest";
import { ownerReviewMailto } from "../client/src/lib/ownerReview";

describe("owner review email helper", () => {
  it("creates a pre-addressed Arabic review request without including post content", () => {
    const url = ownerReviewMailto(42, "عنوان منشور");
    expect(url).toContain("mailto:ssbmbwuugame@gmail.com");
    expect(decodeURIComponent(url)).toContain("منشوري رقم 42");
    expect(decodeURIComponent(url)).toContain("العنوان: عنوان منشور");
    expect(decodeURIComponent(url)).not.toContain("محتوى المنشور");
  });
});
