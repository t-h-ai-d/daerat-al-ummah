import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { attachmentSchema } from "./routers/social";
import { interleaveFeedAuthors } from "./db";

function createAuthenticatedContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "social-test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      username: "test_user",
      avatarUrl: null,
      bio: null,
      country: null,
      madhhabPreference: null,
      accountStatus: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("social input safeguards", () => {
  it("rejects an empty post before attempting storage", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.createPost({ content: "", visibility: "public", attachments: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("does not expose an in-platform report mutation", () => {
    const socialProcedures = appRouter._def.procedures;
    expect("social.report" in socialProcedures).toBe(false);
  });

  it("rejects unsupported upload types before any storage call", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.uploadAttachment({ filename: "payload.exe", mimeType: "application/x-msdownload", dataBase64: "aGVsbG8=" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts only supported public-feed visibility filter values", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.feed({ mode: "following", visibilityScope: "friends" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("recognizes GIF as a supported post attachment kind", () => {
    expect(attachmentSchema.safeParse({ kind: "gif", url: "https://media.example.org/reminder.gif" }).success).toBe(true);
    expect(attachmentSchema.safeParse({ kind: "animated-image", url: "https://media.example.org/reminder.gif" }).success).toBe(false);
  });

  it("balances consecutive authors without using engagement scores", () => {
    const ordered = interleaveFeedAuthors([
      { post: { authorId: 1 }, marker: "newest-a" },
      { post: { authorId: 1 }, marker: "older-a" },
      { post: { authorId: 2 }, marker: "newest-b" },
      { post: { authorId: 3 }, marker: "newest-c" },
    ]);
    expect(ordered.map(item => item.marker)).toEqual(["newest-a", "newest-b", "older-a", "newest-c"]);
  });

  it("rejects invalid community identifiers before a community is created or used for a post", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.createCommunity({ name: "حلقة العلم", slug: "حلقة", description: "مساحة منظمة لمشاركة الدروس والنقاش الهادئ.", kind: "community", visibility: "public" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.social.createPost({ content: "منشور", visibility: "public", communityId: 0, attachments: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
