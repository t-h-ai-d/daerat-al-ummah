import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { assertConversationParticipant } from "./db";
import { chatRouter, directMessageInputSchema, groupConversationInputSchema } from "./routers/chat";

const ctx = {
  user: {
    id: 1,
    openId: "local:test",
    email: "member@example.com",
    name: "عضو",
    username: "member",
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
} as TrpcContext;

describe("chat input safeguards", () => {
  it("rejects a non-participant before private messages can be read or sent", () => {
    expect(() => assertConversationParticipant([])).toThrow("You do not have access to this conversation.");
    expect(assertConversationParticipant([{ id: 1 }])).toEqual({ id: 1 });
  });

  it("rejects invalid conversation identifiers before reading private messages", async () => {
    const caller = chatRouter.createCaller(ctx);
    await expect(caller.messages({ conversationId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects blank private messages before they reach a conversation", async () => {
    const caller = chatRouter.createCaller(ctx);
    await expect(caller.send({ conversationId: 1, content: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("validates bounded group-chat member lists", () => {
    expect(groupConversationInputSchema.safeParse({ name: "أصدقاء العلم", usernames: ["one", "two"] }).success).toBe(true);
    expect(groupConversationInputSchema.safeParse({ name: "مجموعة", usernames: ["one"] }).success).toBe(false);
    expect(groupConversationInputSchema.safeParse({ name: "مجموعة", usernames: Array.from({ length: 20 }, (_, index) => `user${index}`) }).success).toBe(false);
  });

  it("accepts a GIF-only message but requires both GIF fields", () => {
    expect(directMessageInputSchema.safeParse({ conversationId: 1, content: "", attachmentUrl: "https://media.example.org/answer.gif", attachmentKind: "gif" }).success).toBe(true);
    expect(directMessageInputSchema.safeParse({ conversationId: 1, content: "", attachmentUrl: "https://media.example.org/answer.gif" }).success).toBe(false);
  });

  it("accepts image, video, and generic file message attachments", () => {
    for (const attachmentKind of ["image", "video", "file"] as const) {
      expect(directMessageInputSchema.safeParse({ conversationId: 1, content: "", attachmentUrl: "https://media.example.org/file", attachmentKind, attachmentMimeType: "application/octet-stream" }).success).toBe(true);
    }
  });

  it("rejects zero or negative identifiers for member-controlled deletion", async () => {
    const caller = chatRouter.createCaller(ctx);
    await expect(caller.deleteMessage({ messageId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.deleteConversation({ conversationId: -1 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
