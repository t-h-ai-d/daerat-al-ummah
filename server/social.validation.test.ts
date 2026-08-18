import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { attachmentSchema, communitySlugSchema, reportCategorySchema } from "./routers/social";
import { assertPostOwnership, assertReportablePost, interleaveFeedAuthors } from "./db";

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

  it("exposes the protected in-app report mutation but not the retired generic report route", () => {
    const socialProcedures = appRouter._def.procedures;
    expect("social.report" in socialProcedures).toBe(false);
    expect("social.submitReport" in socialProcedures).toBe(true);
  });

  it("exposes only the opt-in browser-push subscription controls", () => {
    const socialProcedures = appRouter._def.procedures;
    expect("social.browserPushStatus" in socialProcedures).toBe(true);
    expect("social.saveBrowserPushSubscription" in socialProcedures).toBe(true);
    expect("social.removeBrowserPushSubscription" in socialProcedures).toBe(true);
    expect("social.sendBrowserPush" in socialProcedures).toBe(false);
  });

  it("rejects malformed browser-push subscriptions before saving a device endpoint", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.saveBrowserPushSubscription({ endpoint: "not-a-url", p256dh: "too-short", auth: "bad" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.social.removeBrowserPushSubscription({ endpoint: "not-a-url" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("exposes a visible post-comment query and validates its post identifier", async () => {
    const socialProcedures = appRouter._def.procedures;
    expect("social.postComments" in socialProcedures).toBe(true);
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.postComments({ postId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an empty visible-thread comment before writing to the database", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.addComment({ postId: 1, content: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts only the four report categories used by the backend report form", () => {
    expect(reportCategorySchema.safeParse("scam").success).toBe(true);
    expect(reportCategorySchema.safeParse("lie").success).toBe(true);
    expect(reportCategorySchema.safeParse("brainrot").success).toBe(true);
    expect(reportCategorySchema.safeParse("haram imagery").success).toBe(true);
    expect(reportCategorySchema.safeParse("other").success).toBe(false);
  });

  it("prevents self-reporting before a report can be recorded or emailed", () => {
    expect(() => assertReportablePost({ authorId: 7 }, 7)).toThrow("لا يمكنك الإبلاغ عن منشورك أنت.");
    expect(assertReportablePost({ authorId: 8 }, 7)).toEqual({ authorId: 8 });
  });

  it("requires author ownership before a post can be edited or deleted", () => {
    expect(() => assertPostOwnership(undefined)).toThrow("لا يمكنك إدارة إلا منشورك أنت.");
    expect(assertPostOwnership({ id: 31 })).toEqual({ id: 31 });
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

  it("accepts Arabic or English community links and rejects unsafe identifiers before a community is created", () => {
    expect(communitySlugSchema.safeParse("حلقة-العلم").success).toBe(true);
    expect(communitySlugSchema.safeParse("quran-study").success).toBe(true);
    expect(communitySlugSchema.safeParse("حلقة العلم!").success).toBe(false);
  });

  it("rejects invalid community identifiers before a community is used for a post", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.createPost({ content: "منشور", visibility: "public", communityId: 0, attachments: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
