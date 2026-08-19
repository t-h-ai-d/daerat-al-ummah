import { describe, expect, it } from "vitest";
import { APP_RELAY_MAX_BYTES, attachmentUploadRoute } from "./attachmentUpload";

describe("attachment upload route selection", () => {
  it("uses the application relay for a typical short video instead of the direct CORS path", () => {
    expect(attachmentUploadRoute(32_000_000)).toBe("relay");
    expect(attachmentUploadRoute(APP_RELAY_MAX_BYTES)).toBe("relay");
  });

  it("uses direct storage only after the relay limit", () => {
    expect(attachmentUploadRoute(APP_RELAY_MAX_BYTES + 1)).toBe("direct");
  });
});
