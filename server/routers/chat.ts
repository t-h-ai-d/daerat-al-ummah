import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, router } from "../_core/trpc";

function mapChatError(error: unknown) {
  const message = error instanceof Error ? error.message : "تعذّر تنفيذ العملية.";
  return new TRPCError({ code: "BAD_REQUEST", message });
}

export const groupConversationInputSchema = z.object({
  name: z.string().trim().max(120).default(""),
  usernames: z.array(z.string().trim().min(3).max(32)).min(2).max(19),
});

export const directMessageInputSchema = z.object({
  conversationId: z.number().int().positive(),
  content: z.string().trim().max(3000).default(""),
  attachmentUrl: z.string().url().max(2000).optional(),
  attachmentKind: z.enum(["gif", "image", "video", "file"]).optional(),
  attachmentMimeType: z.string().max(128).optional(),
  replyToMessageId: z.number().int().positive().optional(),
}).refine(input => Boolean(input.content || (input.attachmentUrl && input.attachmentKind)), { message: "اكتب رسالة أو أرفق مرفقاً." });

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
  createGroup: protectedProcedure
    .input(groupConversationInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.startGroupConversation(ctx.user.id, input.name, input.usernames);
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
  search: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive(), query: z.string().trim().min(1).max(120) }))
    .query(async ({ ctx, input }) => {
      try {
        return await db.searchDirectMessages(ctx.user.id, input.conversationId, input.query);
      } catch (error) {
        throw mapChatError(error);
      }
    }),
  send: protectedProcedure
    .input(directMessageInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return { id: await db.sendDirectMessage(ctx.user.id, input.conversationId, input.content, input.attachmentUrl && input.attachmentKind ? { url: input.attachmentUrl, kind: input.attachmentKind, mimeType: input.attachmentMimeType } : undefined, input.replyToMessageId) };
      } catch (error) {
        throw mapChatError(error);
      }
    }),
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.deleteDirectMessage(ctx.user.id, input.messageId);
      } catch (error) {
        throw mapChatError(error);
      }
    }),
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.deleteDirectConversation(ctx.user.id, input.conversationId);
      } catch (error) {
        throw mapChatError(error);
      }
    }),
});
