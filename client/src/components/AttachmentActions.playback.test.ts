import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./AttachmentActions.tsx", import.meta.url)), "utf8");

describe("published video viewer", () => {
  it("keeps manual controls and metadata preview without automatic playback", () => {
    expect(source).toContain("<video controls preload=\"metadata\"");
    expect(source).not.toContain("controls autoPlay");
  });
});
