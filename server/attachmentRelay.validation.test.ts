import { describe, expect, it } from "vitest";
import { APP_RELAY_MAX_BYTES, buildRelayAttachmentMetadata, safeAttachmentFilename } from "./storage";

describe("attachment relay contract", () => {
  it("keeps normal images in posts and reports browser-safe metadata", () => {
    const metadata = buildRelayAttachmentMetadata("صُورَة عائلية.png", "image/png", 2400);
    expect(metadata).toMatchObject({ kind: "image", scanStatus: "clean", storagePrefix: "posts", sizeBytes: 2400 });
    expect(safeAttachmentFilename("صُورَة عائلية.png")).toBe("_____________.png");
  });

  it("quarantines risky attachments while preserving the shared relay ceiling", () => {
    const metadata = buildRelayAttachmentMetadata("tool.exe", "application/octet-stream", 512);
    expect(metadata).toMatchObject({ kind: "file", scanStatus: "pending", storagePrefix: "quarantine" });
    expect(APP_RELAY_MAX_BYTES).toBe(25_000_000);
  });
});
