import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const homeSource = readFileSync(fileURLToPath(new URL("./Home.tsx", import.meta.url)), "utf8");

describe("home publishing boundary", () => {
  it("keeps the feed free of the public post-creation mutation", () => {
    expect(homeSource).not.toContain("social.createPost");
  });

  it("routes the visible publishing entry point to Creator Studio", () => {
    expect(homeSource).toContain('setLocation(isAuthenticated ? "/studio" : "/auth")');
    expect(homeSource).toContain("اِصنَعْ مَحتواكَ في اِسْتُودْيُو المُنشِئ");
  });
});
