import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core authenticated account and its public Islamic identity preferences.
 * Madhhab is always stored and displayed as an optional personal preference,
 * never as a ranking or eligibility mechanism.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  username: varchar("username", { length: 32 }).unique(),
  avatarUrl: text("avatarUrl"),
  bio: text("bio"),
  country: varchar("country", { length: 96 }),
  madhhabPreference: varchar("madhhabPreference", { length: 48 }),
  accountStatus: mysqlEnum("accountStatus", ["active", "warned", "banned"])
    .default("active")
    .notNull(),
  profileVisibility: mysqlEnum("profileVisibility", ["public", "friends"])
    .default("public")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const communities = mysqlTable(
  "communities",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 96 }).notNull().unique(),
    description: text("description").notNull(),
    kind: mysqlEnum("kind", ["community", "group", "subcommunity"]).default("community").notNull(),
    parentId: int("parentId"),
    visibility: mysqlEnum("visibility", ["public", "members"]).default("public").notNull(),
    creatorId: int("creatorId").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("communities_parent_created_idx").on(table.parentId, table.createdAt),
    index("communities_creator_created_idx").on(table.creatorId, table.createdAt),
    index("communities_visibility_created_idx").on(table.visibility, table.createdAt),
  ],
);

export const communityMembers = mysqlTable(
  "communityMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    communityId: int("communityId").notNull().references(() => communities.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["owner", "member"]).default("member").notNull(),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("community_member_unique").on(table.communityId, table.userId),
    index("community_member_user_idx").on(table.userId, table.communityId),
  ],
);

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  kind: mysqlEnum("kind", ["direct"]).default("direct").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const conversationParticipants = mysqlTable(
  "conversationParticipants",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
    lastReadAt: timestamp("lastReadAt"),
  },
  table => [
    uniqueIndex("conversation_participant_unique").on(table.conversationId, table.userId),
    index("conversation_participant_user_idx").on(table.userId, table.conversationId),
  ],
);

export const directMessages = mysqlTable(
  "directMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    conversationId: int("conversationId")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: int("senderId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    attachmentUrl: text("attachmentUrl"),
    attachmentKind: mysqlEnum("attachmentKind", ["gif"]),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("messages_conversation_created_idx").on(table.conversationId, table.createdAt)],
);

export const posts = mysqlTable(
  "posts",
  {
    id: int("id").autoincrement().primaryKey(),
    authorId: int("authorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    communityId: int("communityId").references(() => communities.id, { onDelete: "set null" }),
    title: varchar("title", { length: 240 }),
    content: text("content").notNull(),
    textStyle: mysqlEnum("textStyle", ["default", "serif", "emphasis"]).default("default").notNull(),
    imageUrl: text("imageUrl"),
    linkUrl: text("linkUrl"),
    hashtags: varchar("hashtags", { length: 512 }),
    visibility: mysqlEnum("visibility", ["public", "friends"]).default("public").notNull(),
    moderationStatus: mysqlEnum("moderationStatus", ["published", "under_review", "removed"])
      .default("published")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("posts_author_created_idx").on(table.authorId, table.createdAt),
    index("posts_community_created_idx").on(table.communityId, table.createdAt),
    index("posts_status_created_idx").on(table.moderationStatus, table.createdAt),
  ],
);

export const follows = mysqlTable(
  "follows",
  {
    id: int("id").autoincrement().primaryKey(),
    followerId: int("followerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: int("followingId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("follows_pair_unique").on(table.followerId, table.followingId),
    index("follows_following_idx").on(table.followingId),
  ],
);

export const friendships = mysqlTable(
  "friendships",
  {
    id: int("id").autoincrement().primaryKey(),
    requesterId: int("requesterId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientId: int("recipientId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("friendships_requester_recipient_unique").on(table.requesterId, table.recipientId),
    index("friendships_recipient_status_idx").on(table.recipientId, table.status),
    index("friendships_requester_status_idx").on(table.requesterId, table.status),
  ],
);

export const likes = mysqlTable(
  "likes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("likes_user_post_unique").on(table.userId, table.postId),
    index("likes_post_idx").on(table.postId),
  ],
);

export const comments = mysqlTable(
  "comments",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: int("authorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("comments_post_created_idx").on(table.postId, table.createdAt)],
);

export const reposts = mysqlTable(
  "reposts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("reposts_user_post_unique").on(table.userId, table.postId),
    index("reposts_post_idx").on(table.postId),
  ],
);

export const savedPosts = mysqlTable(
  "savedPosts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("saved_posts_user_post_unique").on(table.userId, table.postId),
    index("saved_posts_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const postAttachments = mysqlTable(
  "postAttachments",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId").references(() => posts.id, { onDelete: "cascade" }),
    uploaderId: int("uploaderId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", ["image", "gif", "video", "file", "link"]).notNull(),
    storageKey: varchar("storageKey", { length: 512 }),
    url: text("url").notNull(),
    filename: varchar("filename", { length: 255 }),
    mimeType: varchar("mimeType", { length: 128 }),
    sizeBytes: int("sizeBytes"),
    scanStatus: mysqlEnum("scanStatus", ["pending", "clean", "blocked"]).notNull().default("clean"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("attachments_post_idx").on(table.postId),
    index("attachments_uploader_idx").on(table.uploaderId, table.createdAt),
  ],
);

/**
 * Immutable record of a conservative AI-assisted screening verdict. This is
 * not a religious ruling and cannot itself ban an account or remove content.
 */
export const aiModerationChecks = mysqlTable(
  "aiModerationChecks",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId").notNull().references(() => posts.id, { onDelete: "cascade" }).unique(),
    source: mysqlEnum("source", ["rules", "ai", "fallback"]).notNull(),
    model: varchar("model", { length: 96 }),
    action: mysqlEnum("action", ["published", "under_review"]).notNull(),
    category: mysqlEnum("category", ["none", "spam", "scam", "deception", "attention_harm", "religious_disrespect", "haram_imagery_claim", "harassment"]).notNull(),
    confidence: int("confidence").notNull(),
    rationale: text("rationale").notNull(),
    creatorMessage: varchar("creatorMessage", { length: 500 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("ai_moderation_action_created_idx").on(table.action, table.createdAt)],
);

export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
    postId: int("postId")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    reporterId: int("reporterId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: mysqlEnum("category", ["scam", "lie", "brainrot", "haram imagery"]).notNull(),
    details: text("details"),
    status: mysqlEnum("status", ["open", "reviewed", "dismissed"]).default("open").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    reviewedAt: timestamp("reviewedAt"),
  },
  table => [
    index("reports_status_created_idx").on(table.status, table.createdAt),
    uniqueIndex("reports_reporter_post_unique").on(table.reporterId, table.postId),
  ],
);

export const moderationActions = mysqlTable(
  "moderationActions",
  {
    id: int("id").autoincrement().primaryKey(),
    reportId: int("reportId").references(() => reports.id, { onDelete: "set null" }),
    moderatorId: int("moderatorId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: int("targetUserId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: mysqlEnum("action", ["warning", "ban", "remove_post", "dismiss_report"]).notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("moderation_target_user_idx").on(table.targetUserId, table.createdAt)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    recipientId: int("recipientId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: int("actorId").references(() => users.id, { onDelete: "set null" }),
    postId: int("postId").references(() => posts.id, { onDelete: "cascade" }),
    commentId: int("commentId").references(() => comments.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["follow", "like", "comment", "repost", "mention", "moderation"])
      .notNull(),
    message: varchar("message", { length: 280 }).notNull(),
    readAt: timestamp("readAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("notifications_recipient_created_idx").on(table.recipientId, table.createdAt)],
);

/**
 * Per-browser, opt-in Web Push delivery endpoints. The endpoint hash prevents
 * a duplicate device registration without trying to index a long URL directly.
 */
export const browserPushSubscriptions = mysqlTable(
  "browserPushSubscriptions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    endpointHash: varchar("endpointHash", { length: 64 }).notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: varchar("p256dh", { length: 255 }).notNull(),
    auth: varchar("auth", { length: 255 }).notNull(),
    userAgent: varchar("userAgent", { length: 512 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("push_subscription_endpoint_unique").on(table.endpointHash),
    index("push_subscription_user_idx").on(table.userId, table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type Report = typeof reports.$inferSelect;
