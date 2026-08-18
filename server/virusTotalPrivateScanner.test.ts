import { describe, expect, it } from "vitest";
import { derivePrivateScanVerdict, scannerEligibility, VIRUSTOTAL_MAX_PRIVATE_UPLOAD_BYTES } from "./virusTotalPrivateScanner";

describe("private attachment scan safeguards", () => {
  it("keeps incomplete analyses pending", () => {
    expect(derivePrivateScanVerdict({ status: "queued" })).toBe("pending");
  });

  it("blocks malicious and suspicious completed analyses", () => {
    expect(derivePrivateScanVerdict({ status: "completed", stats: { malicious: 1 } })).toBe("blocked");
    expect(derivePrivateScanVerdict({ status: "completed", results: { engine: { category: "suspicious" } } })).toBe("blocked");
  });

  it("marks only a completed no-detection analysis clean", () => {
    expect(derivePrivateScanVerdict({ status: "completed", stats: { malicious: 0, suspicious: 0 } })).toBe("clean");
  });

  it("never submits files over VirusTotal private scanning's documented 650 MB maximum", () => {
    expect(scannerEligibility(VIRUSTOTAL_MAX_PRIVATE_UPLOAD_BYTES + 1, "valid-key")).toBe("oversize");
  });
});
