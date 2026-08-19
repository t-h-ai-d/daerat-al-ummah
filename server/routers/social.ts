import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { storageCreatePresignedUpload, storageDelete, storagePut } from "../storage";
import { sendPostReportEmail } from "../reportEmail";
import { attachmentScanStatus, requiresAttachmentQuarantine } from "../attachmentSecurity";
import { queuePrivateAttachmentScan } from "../virusTotalPrivateScanner";

export const MAX_ATTACHMENT_BYTES = 1_073_741_824;
export const MAX_BASE64_ATTACHMENT_BYTES = 50_000_000;
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

function isAudioOrVideoAttachment(attachment: z.infer<typeof attachmentSchema>) {
  return attachment.kind === "video" || attachment.mimeType?.toLowerCase().startsWith("audio/") === true || attachment.mimeType?.toLowerCase().startsWith("video/") === true;
}

export const createPostInputSchema = z.object({
  title: z.string().trim().max(240).optional(),
  content: z.string().trim().max(5000).default(""),
  textStyle: z.enum(["default", "serif", "emphasis"]).default("default"),
  visibility: z.enum(["public", "friends"]).default("public"),
  communityId: z.number().int().positive().optional(),
  attachments: z.array(attachmentSchema).default([]),
}).superRefine((input, context) => {
  if (!input.content && !input.attachments.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["content"], message: "اكتب نصًّا، أو أضف مرفقًا واحدًا على الأقل." });
  }
  if (input.attachments.filter(isAudioOrVideoAttachment).length > 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["attachments"], message: "يُسمح بمرفق فيديو أو صوت واحد فقط في المنشور." });
  }
});

export const communityKindSchema = z.enum(["community", "group", "channel"]);
export const communityResourceKindSchema = z.enum(["link", "document", "video"]);
export const communityResourceUrlSchema = z.string().trim().max(2000).url("أدخل رابطًا صحيحًا يبدأ بـ https:// أو http://.").refine(value => /^https?:\/\//i.test(value), "يُقبل رابط http أو https فقط.");

export const communitySlugSchema = z.string().trim().toLowerCase().min(3).max(96).regex(/^[a-zA-Z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF-]+$/, "استخدم حروفًا أو أرقامًا أو شرطات فقط، بالعربية أو الإنجليزية.");

function attachmentKind(mimeType: string): "image" | "gif" | "video" | "file" {
  if (mimeType === "image/gif") return "gif";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "file";
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

async function useConfiguredStorage<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[AttachmentStorage] operation failed", { message });
    if (/invalid url|object storage|s3_endpoint|endpoint/i.test(message)) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "تعذّر تجهيز مساحة الملفات الآن. لم يُنشَر أي محتوى؛ أعد المحاولة بعد لحظة.",
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "تعذّر رفع الملف الآن. لم يُنشَر أي محتوى، ويمكنك المحاولة مجددًا.",
    });
  }
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
  communityResources: publicProcedure
    .input(z.object({ communityId: z.number().int().positive() }))
    .query(({ ctx, input }) => db.listCommunityResources(ctx.user?.id, input.communityId)),
  createCommunity: protectedProcedure
    .input(z.object({ name: z.string().trim().min(3).max(120), slug: communitySlugSchema, description: z.string().trim().min(12).max(1600), kind: communityKindSchema, parentId: z.number().int().positive().optional(), visibility: z.enum(["public", "members"]).default("public") }))
    .mutation(({ ctx, input }) => db.createCommunity(ctx.user.id, input)),
  joinCommunity: protectedProcedure
    .input(z.object({ communityId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.joinCommunity(ctx.user.id, input.communityId)),
  leaveCommunity: protectedProcedure
    .input(z.object({ communityId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.leaveCommunity(ctx.user.id, input.communityId)),
  createCommunityResource: protectedProcedure
    .input(z.object({
      communityId: z.number().int().positive(),
      title: z.string().trim().min(3).max(180),
      description: z.string().trim().max(1000).optional(),
      url: communityResourceUrlSchema,
      kind: communityResourceKindSchema.default("link"),
    }))
    .mutation(({ ctx, input }) => db.createCommunityResource(ctx.user.id, input)),
  deleteCommunityResource: protectedProcedure
    .input(z.object({ resourceId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.deleteCommunityResource(ctx.user.id, input.resourceId)),
  createPost: protectedProcedure
    .input(createPostInputSchema)
    .mutation(async ({ ctx, input }) => {
      const created = await db.createPost(ctx.user.id, input);
      for (const attachment of input.attachments) {
        if (!attachment.storageKey || !requiresAttachmentQuarantine(attachment.filename, attachment.mimeType)) continue;
        if (!attachment.storageKey.startsWith(`${ctx.user.id}/quarantine/`)) continue;
        void queuePrivateAttachmentScan({
          storageKey: attachment.storageKey,
          filename: attachment.filename || "quarantined-file",
          mimeType: attachment.mimeType || "application/octet-stream",
          sizeBytes: attachment.sizeBytes || 0,
        });
      }
      return created;
    }),
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
  toggleMemberBlock: protectedProcedure
    .input(z.object({ blockedId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.toggleMemberBlock(ctx.user.id, input.blockedId)),
  blockedMembers: protectedProcedure.query(({ ctx }) => db.listBlockedMembers(ctx.user.id)),
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
  toggleSavedPost: protectedProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.toggleSavedPost(ctx.user.id, input.postId)),
  savedPosts: protectedProcedure.query(({ ctx }) => db.listSavedPosts(ctx.user.id)),
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
  deleteNotification: protectedProcedure
    .input(z.object({ notificationId: z.number().int().positive() }))
    .mutation(({ ctx, input }) => db.deleteNotification(ctx.user.id, input.notificationId)),
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
  prepareAttachmentUpload: protectedProcedure
    .input(z.object({ filename: z.string().trim().min(1).max(255), mimeType: z.string().trim().min(1).max(128), sizeBytes: z.number().int().positive().max(MAX_ATTACHMENT_BYTES) }))
    .mutation(async ({ ctx, input }) => {
      const mimeType = input.mimeType || "application/octet-stream";
      const scanStatus = attachmentScanStatus(input.filename, mimeType);
      const prefix = requiresAttachmentQuarantine(input.filename, mimeType) ? "quarantine" : "posts";
      const result = await useConfiguredStorage(() => storageCreatePresignedUpload(`${ctx.user.id}/${prefix}/${safeFilename(input.filename)}`, mimeType));
      return {
        ...result,
        filename: input.filename,
        mimeType,
        sizeBytes: input.sizeBytes,
        kind: attachmentKind(mimeType),
        scanStatus,
        sharedLimitBytes: MAX_ATTACHMENT_BYTES,
      };
    }),
  discardAttachmentUpload: protectedProcedure
    .input(z.object({ storageKey: z.string().trim().min(1).max(512) }))
    .mutation(async ({ ctx, input }) => {
      if (!input.storageKey.startsWith(`${ctx.user.id}/`)) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك حذف مرفق لا يخصّك." });
      if (await db.isPostAttachmentStored(input.storageKey)) throw new TRPCError({ code: "CONFLICT", message: "لا يمكن حذف مرفق بعد نشره ضمن منشور." });
      await storageDelete(input.storageKey);
      return { deleted: true as const };
    }),
  uploadAttachment: protectedProcedure
    .input(z.object({ filename: z.string().min(1).max(255), mimeType: z.string().min(1).max(128), dataBase64: z.string().min(1).max(MAX_ATTACHMENT_BASE64_CHARS) }))
    .mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (!bytes.length || bytes.length > MAX_BASE64_ATTACHMENT_BYTES) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "الرفع القديم عبر Base64 محدود بـ50 ميغابايت؛ استخدم الرفع المباشر للملفات الأكبر." });
      const scanStatus = attachmentScanStatus(input.filename, input.mimeType);
      const prefix = requiresAttachmentQuarantine(input.filename, input.mimeType) ? "quarantine" : "posts";
      const result = await useConfiguredStorage(() => storagePut(`${ctx.user.id}/${prefix}/${safeFilename(input.filename)}`, bytes, input.mimeType));
      return { ...result, filename: input.filename, mimeType: input.mimeType, sizeBytes: bytes.length, kind: attachmentKind(input.mimeType), scanStatus };
    }),
  uploadAvatar: protectedProcedure
    .input(z.object({ filename: z.string().min(1).max(255), mimeType: z.string().startsWith("image/").max(128), dataBase64: z.string().min(1).max(10_000_000) }))
    .mutation(async ({ ctx, input }) => {
      const bytes = Buffer.from(input.dataBase64, "base64");
      if (!bytes.length || bytes.length > 6_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Profile images must be 6 MB or smaller." });
      return useConfiguredStorage(() => storagePut(`${ctx.user.id}/avatar/${Date.now()}-${safeFilename(input.filename)}`, bytes, input.mimeType));
    }),
});
