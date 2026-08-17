import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

function mapChatError(error: unknown) {
  const message = error instanceof Error ? error.message : "تعذّر تنفيذ العملية.";
  return new TRPCError({ code: "BAD_REQUEST", message });
}

export const chatRouter = router({
  conversations: protectedProcedure.query(({ ctx }) => db.listDirectConversations(ctx.user.id)),
  start: protectedProcedure
    .input(z.object({ username: z.string().trim().min(3).max(32) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.startDirectConversation(ctx.user.id, input.username);
      } catch (error) {
        throw mapChatError(error);
      }
    }),
  messages: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        return await db.listDirectMessages(ctx.user.id, input.conversationId);
      } catch (error) {
        throw mapChatError(error);
      }
    }),
  send: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), content: z.string().trim().min(1).max(3000) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return { id: await db.sendDirectMessage(ctx.user.id, input.conversationId, input.content) };
      } catch (error) {
        throw mapChatError(error);
      }
    }),
});
