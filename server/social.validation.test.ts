import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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

  it("accepts only the exact reporting categories", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.report({ postId: 1, category: "misinformation" as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects unsupported upload types before any storage call", async () => {
    const caller = appRouter.createCaller(createAuthenticatedContext());
    await expect(caller.social.uploadAttachment({ filename: "payload.exe", mimeType: "application/x-msdownload", dataBase64: "aGVsbG8=" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
