import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Community resources in platform shell", () => {
  const source = readFileSync(resolve(process.cwd(), "client/src/components/PlatformShell.tsx"), "utf8");

  it("renders the resource strip only for a community detail route", () => {
    expect(source).toContain("CommunityResourceStrip");
    expect(source).toContain("/^\\/communities\\/([^/]+)$/");
    expect(source).toContain("<CommunityResourceStrip slug=");
  });

  it("uses the protected resource contracts and keeps owner actions explicit", () => {
    expect(source).toContain("trpc.social.communityResources.useQuery");
    expect(source).toContain("trpc.social.createCommunityResource.useMutation");
    expect(source).toContain("trpc.social.deleteCommunityResource.useMutation");
    expect(source).toContain('membership?.role === "owner"');
  });
});
