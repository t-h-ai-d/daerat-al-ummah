import { describe, expect, it } from "vitest";
import { deterministicModeration } from "./aiModeration";

describe("deterministic Islamic platform anti-spam safeguards", () => {
  it("holds repeated promotional links for review without publishing them automatically", () => {
    const verdict = deterministicModeration(undefined, "اربح بسرعة الآن https://a.example https://b.example https://c.example");
    expect(verdict).toMatchObject({ action: "review", category: "spam", source: "rules" });
  });

  it("does not flag ordinary Arabic faith discussion as a rule violation", () => {
    expect(deterministicModeration("تدبر آية", "ما الدروس التي تتعلمونها من هذه الآية الكريمة؟")).toBeNull();
  });
});
