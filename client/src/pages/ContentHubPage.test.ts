import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Content Hub boundary", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/pages/ContentHubPage.tsx"), "utf8");

  it("uses the bounded chronological feed and exposes the Studio path", () => {
    expect(source).toContain('mode: "chronological"');
    expect(source).toContain(".slice(0, 12)");
    expect(source).toContain('"/studio"');
  });

  it("includes the intended media filters without automatic playback", () => {
    expect(source).toContain('"video"');
    expect(source).toContain('"image"');
    expect(source).toContain('"file"');
    expect(source).not.toContain("autoPlay");
  });
});
