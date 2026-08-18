import { describe, expect, it } from "vitest";
import { MAX_BASE64_UPLOAD_BODY } from "./_core/app";
import { MAX_ATTACHMENT_BASE64_CHARS, MAX_ATTACHMENT_BYTES } from "./routers/social";

describe("base64 upload request limits", () => {
  it("keeps the API body limit above the largest permitted encoded file", () => {
    const parserBytes = 70 * 1024 * 1024;
    expect(MAX_BASE64_UPLOAD_BODY).toBe("70mb");
    expect(parserBytes).toBeGreaterThan(MAX_ATTACHMENT_BASE64_CHARS);
    expect(MAX_ATTACHMENT_BASE64_CHARS).toBeGreaterThan(Math.ceil(MAX_ATTACHMENT_BYTES * 4 / 3));
  });
});
