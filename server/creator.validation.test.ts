import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { assertPostOwnership } from "./db";

const ctx = {
  user: {
    id: 1,
    openId: "local:creator-test",
    email: "creator@example.com",
    name: "منشئ",
    username: "creator",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

describe("creator controls validation", () => {
  it("rejects an oversized post title before persistence", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.social.createPost({ title: "أ".repeat(241), content: "نص صالح", textStyle: "default", visibility: "public", attachments: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an unsupported text style before persistence", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.social.createPost({ content: "نص صالح", textStyle: "invalid" as never, visibility: "public", attachments: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects invalid delete identifiers before the author-only deletion check", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.social.deletePost({ postId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an unsupported post attachment type before storage", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.social.uploadAttachment({ filename: "blocked.bin", mimeType: "application/octet-stream", dataBase64: "dGVzdA==" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts only image MIME types for direct avatar uploads", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.social.uploadAvatar({ filename: "profile.pdf", mimeType: "application/pdf" as never, dataBase64: "dGVzdA==" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("prevents deletion when a post does not belong to the requesting author", () => {
    expect(() => assertPostOwnership(undefined)).toThrow("You can only delete your own post.");
  });
});
