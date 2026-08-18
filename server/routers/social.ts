import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { sendPostReportEmail } from "../reportEmail";

export const MAX_ATTACHMENT_BYTES = 50_000_000;
export const MAX_ATTACHMENT_BASE64_CHARS = 68_000_000;
export const reportCategorySchema = z.enum(["scam", "lie", "brainrot", "haram imagery"]);

export const attachmentSchema = z.object({
  kind: z.enum(["image", "gif", "video", "file", "link"]),
  url: z.string().min(1).max(2000),
  storageKey: z.string().max(512).nullable().optional(),
  filename: z.string().max(255).nullable().optional(),
  mimeType: z.string().max(128).nullable().optional(),
  sizeBytes: z.number().int().positive().max(MAX_ATTACHMENT_BYTES).nullable().optional(),
});

export const communitySlugSchema = z.string().trim().toLowerCase().min(3).max(96).regex(/^[a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF-]+$/, "استخدم حروفًا أو أرقامًا أو شرطات فقط، بالعربية أو الإنجليزية.");

const safeMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

export const socialRouter = router({
  myProfile: protectedProcedure.query(({ ctx }) => db.getUserById(ctx.user.id)),
  feed: publicProcedure
    .input(z.object({ mode: z.enum(["following", "chronological", "balanced"]).default("following"), mediaType: z.enum(["image", "gif", "video", "file", "link"]).optional(), visibilityScope: z.enum(["all", "public"]).default("all") }))
    .query(({ ctx, input }) => db.listFeed(ctx.user?.id, input.mode, input.mediaType, input.visibilityScope)),
  communities: publicProcedure.query(({ ctx }) => db.listCommunities(ctx.user?.id)),
  community: publicProcedure
    .input(z.object({ slug: communitySlugSchema }))
    .query(({ ctx, input }) => db.getCommunityDetails(ctx.user?.id, input.slug)),
  communityFeed: publicProcedure
    .input(z.object({ communityId: z.number().int().positive() }))
    .query(({ ctx, input }) => db.listCommunityFeed(ctx.user?.id, input.communityId)),
  createCommunity: protectedProcedure
    .input(z.object({ name: z.string().trim().min(3).max(120), slug: communitySlugSchema, description: z.string().trim().min(12).max(1600), kind: z.enum(["community", "group"]), parentId: z.number().int().positive().optional(), visibility: z.enum(["public", "members"]).default("public") }))
    .mutation(({ ctx, input }) => db.createCommunity(ctx.user.id, input)),
  joinCommunity: protectedProcedure
    .input(z.object({ communityId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.joinCommunity(ctx.user.id, input.communityId)),
  leaveCommunity: protectedProcedure
    .input(z.object({ communityId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.leaveCommunity(ctx.user.id, input.communityId)),
  createPost: protectedProcedure
    .input(z.object({ title: z.string().trim().max(240).optional(), content: z.string().trim().min(1).max(5000), textStyle: z.enum(["default", "serif", "emphasis"]).default("default"), visibility: z.enum(["public", "friends"]).default("public"), communityId: z.number().int().positive().optional(), attachments: z.array(attachmentSchema).max(5).default([]) }))
    .mutation(({ ctx, input }) => db.createPost(ctx.user.id, input)),
  myPosts: protectedProcedure.query(({ ctx }) => db.listMyPosts(ctx.user.id)),
  deletePost: protectedProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.deletePostByAuthor(ctx.user.id, input.postId)),
  updatePost: protectedProcedure
    .input(z.object({ postId: z.number().int().positive(), content: z.string().trim().min(1).max(5000).optional(), visibility: z.enum(["public", "friends"]).optional() }).refine(input => input.content !== undefined || input.visibility !== undefined, "حدّد تغييرًا واحدًا على الأقل."))
    .mutation(({ ctx, input }) => db.updatePostByAuthor(ctx.user.id, input.postId, { content: input.content, visibility: input.visibility })),
  submitReport: protectedProcedure
    .input(z.object({ postId: z.number().int().positive(), category: reportCategorySchema, details: z.string().trim().max(2000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const report = await db.createReport(ctx.user.id, input.postId, input.category, input.details);
      await sendPostReportEmail({ reportId: report.reportId, postId: input.postId, reporterId: ctx.user.id, reporterName: ctx.user.username || ctx.user.name, category: input.category, details: input.details });
      return { ...report, delivered: true as const };
    }),
  toggleFollow: protectedProcedure
    .input(z.object({ targetUserId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.toggleFollow(ctx.user.id, input.targetUserId)),
  friendships: protectedProcedure.query(({ ctx }) => db.listFriendships(ctx.user.id)),
  requestFriendship: protectedProcedure
    .input(z.object({ targetUserId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.requestFriendship(ctx.user.id, input.targetUserId)),
  respondToFriendship: protectedProcedure
    .input(z.object({ friendshipId: z.number().int().positive(), response: z.enum(["accepted", "rejected"]) }))
    .mutation(({ ctx, input }) => db.respondToFriendship(ctx.user.id, input.friendshipId, input.response)),
  toggleLike: protectedProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.toggleLike(ctx.user.id, input.postId)),
  toggleRepost: protectedProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.toggleRepost(ctx.user.id, input.postId)),
  addComment: protectedProcedure
    .input(z.object({ postId: z.number().int().positive(), content: z.string().trim().min(1).max(1800) }))
    .mutation(({ ctx, input }) => db.addComment(ctx.user.id, input.postId, input.content)),
  postComments: publicProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .query(({ ctx, input }) => db.listPostComments(ctx.user?.id, input.postId)),
  search: publicProcedure
    .input(z.object({ query: z.string().trim().min(1).max(100) }))
    .query(({ ctx, input }) => db.searchCircle(input.query, ctx.user?.id)),
  notifications: protectedProcedure.query(({ ctx }) => db.listNotifications(ctx.user.id)),
  markNotificationRead: protectedProcedure
    .input(z.object({ notificationId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.markNotificationRead(ctx.user.id, input.notificationId)),
  browserPushStatus: protectedProcedure.query(({ ctx }) => db.getBrowserPushSubscriptionStatus(ctx.user.id)),
  saveBrowserPushSubscription: protectedProcedure
    .input(z.object({ endpoint: z.string().url().max(4000), p256dh: z.string().min(16).max(255), auth: z.string().min(8).max(255), userAgent: z.string().max(512).optional() }))
    .mutation(({ ctx, input }) => db.saveBrowserPushSubscription(ctx.user.id, input)),
  removeBrowserPushSubscription: protectedProcedure
    .input(z.object({ endpoint: z.string().url().max(4000).optional() }))
    .mutation(({ ctx, input }) => db.removeBrowserPushSubscription(ctx.user.id, input.endpoint)),
  updateProfile: protectedProcedure
    .input(z.object({ username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_\u0600-\u06FF]+$/).optional(), avatarUrl: z.string().trim().max(2000).optional(), bio: z.string().trim().max(500).optional(), country: z.string().trim().max(96).optional(), madhhabPreference: z.string().trim().max(48).optional(), profileVisibility: z.enum(["public", "friends"]).optional() }))
    .mutation(({ ctx, input }) => db.updateProfile(ctx.user.id, input)),
  uploadAttachment: protectedProcedure
    .input(z.object({ filename: z.string().min(1).max(255), mimeType: z.string().min(1).max(128), dataBase64: z.string().min(1).max(MAX_ATTACHMENT_BASE64_CHARS) }))
    .mutation(async ({ ctx, input }) => {
      const isImage = input.mimeType.startsWith("image/");
      const isVideo = input.mimeType.startsWith("video/");
      if (!isImage && !isVideo && !safeMimeTypes.has(input.mimeType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "نوع هذا الملف غير مدعوم." });
      }
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (!bytes.length || bytes.length > MAX_ATTACHMENT_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "حجم المرفق يجب أن يكون 50 ميغابايت أو أقل." });
      const result = await storagePut(`${ctx.user.id}/posts/${safeFilename(input.filename)}`, bytes, input.mimeType);
      return { ...result, filename: input.filename, mimeType: input.mimeType, sizeBytes: bytes.length, kind: input.mimeType === "image/gif" ? "gif" as const : isImage ? "image" as const : isVideo ? "video" as const : "file" as const };
    }),
  uploadAvatar: protectedProcedure
    .input(z.object({ filename: z.string().min(1).max(255), mimeType: z.string().startsWith("image/").max(128), dataBase64: z.string().min(1).max(10_000_000) }))
    .mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (!bytes.length || bytes.length > 6_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Profile images must be 6 MB or smaller." });
      return storagePut(`${ctx.user.id}/avatar/${Date.now()}-${safeFilename(input.filename)}`, bytes, input.mimeType);
    }),
});
