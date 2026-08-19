import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { attachmentSchema, communityKindSchema, communityResourceKindSchema, communityResourceUrlSchema, communitySlugSchema, createPostInputSchema, reportCategorySchema } from "./routers/social";
import { assertPostOwnership, assertReportablePost, interleaveFeedAuthors } from "./db";
import { attachmentScanStatus, isAttachmentDownloadAllowed, requiresAttachmentQuarantine } from "./attachmentSecurity";
import { readFileSync } from "node:fs";

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

  it("accepts channels as a community type while rejecting unknown types", () => {
    expect(communityKindSchema.safeParse("channel").success).toBe(true);
    expect(communityKindSchema.safeParse("forum").success).toBe(false);
  });

  it("exposes owner-managed pinned community resources and rejects unsafe resource input", async () => {
    const socialProcedures = appRouter._def.procedures;
    expect("social.communityResources" in socialProcedures).toBe(true);
    expect("social.createCommunityResource" in socialProcedures).toBe(true);
    expect("social.deleteCommunityResource" in socialProcedures).toBe(true);
    expect(communityResourceKindSchema.safeParse("video").success).toBe(true);
    expect(communityResourceKindSchema.safeParse("archive").success).toBe(false);
    expect(communityResourceUrlSchema.safeParse("https://example.org/lesson").success).toBe(true);
    expect(communityResourceUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.createCommunityResource({ communityId: 0, title: "مورد نافع", url: "https://example.org", kind: "link" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.social.deleteCommunityResource({ resourceId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
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

  it("exposes protected save and saved-post procedures", async () => {
    const socialProcedures = appRouter._def.procedures;
    expect("social.toggleSavedPost" in socialProcedures).toBe(true);
    expect("social.savedPosts" in socialProcedures).toBe(true);
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.toggleSavedPost({ postId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("exposes direct-upload tickets and quarantines executable or script files before delivery", () => {
    const socialProcedures = appRouter._def.procedures;
    expect("social.prepareAttachmentUpload" in socialProcedures).toBe(true);
    expect(requiresAttachmentQuarantine("payload.exe", "application/x-msdownload")).toBe(true);
    expect(requiresAttachmentQuarantine("script.txt", "application/x-sh")).toBe(true);
    expect(attachmentScanStatus("payload.exe", "application/x-msdownload")).toBe("pending");
    expect(attachmentScanStatus("lesson.pdf", "application/pdf")).toBe("clean");
    expect(isAttachmentDownloadAllowed("pending")).toBe(false);
    expect(isAttachmentDownloadAllowed("blocked")).toBe(false);
    expect(isAttachmentDownloadAllowed("clean")).toBe(true);
  });

  it("accepts only supported public-feed visibility filter values", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.feed({ mode: "following", visibilityScope: "friends" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("recognizes GIF as a supported post attachment kind", () => {
    expect(attachmentSchema.safeParse({ kind: "gif", url: "https://media.example.org/reminder.gif" }).success).toBe(true);
    expect(attachmentSchema.safeParse({ kind: "animated-image", url: "https://media.example.org/reminder.gif" }).success).toBe(false);
  });

  it("allows any number of non-media attachments but only one combined audio or video attachment", () => {
    const files = Array.from({ length: 12 }, (_, index) => ({ kind: "file" as const, url: `https://storage.example.org/file-${index}.pdf`, filename: `file-${index}.pdf` }));
    expect(createPostInputSchema.safeParse({ content: "مرفقات نافعة", attachments: files }).success).toBe(true);
    expect(createPostInputSchema.safeParse({ content: "مقطع واحد", attachments: [...files, { kind: "video", url: "https://storage.example.org/lesson.mp4", mimeType: "video/mp4" }] }).success).toBe(true);
    expect(createPostInputSchema.safeParse({ content: "مقطعان", attachments: [{ kind: "video", url: "https://storage.example.org/lesson.mp4", mimeType: "video/mp4" }, { kind: "file", url: "https://storage.example.org/audio.mp3", mimeType: "audio/mpeg" }] }).success).toBe(false);
  });

  it("exposes a protected pre-post attachment discard action", () => {
    expect("social.discardAttachmentUpload" in appRouter._def.procedures).toBe(true);
  });

  it("exposes protected member blocking controls and validates blocked identifiers", async () => {
    const socialProcedures = appRouter._def.procedures;
    expect("social.toggleMemberBlock" in socialProcedures).toBe(true);
    expect("social.blockedMembers" in socialProcedures).toBe(true);
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.toggleMemberBlock({ blockedId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("validates friendship targets and records requests as visible in-app notifications", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.requestFriendship({ targetUserId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const databaseSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(databaseSource).toContain('message: "أرسل لك طلب صداقة — افتح ملفك لقبوله أو رفضه."');
  });

  it("exposes the protected image-only profile avatar uploader", async () => {
    expect("social.uploadAvatar" in appRouter._def.procedures).toBe(true);
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.uploadAvatar({ filename: "avatar.txt", mimeType: "text/plain" as never, dataBase64: "YQ==" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
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
