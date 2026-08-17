import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { assertConversationParticipant } from "./db";
import { chatRouter } from "./routers/chat";

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
});
