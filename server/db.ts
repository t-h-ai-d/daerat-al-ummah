import {
  and,
  desc,
  eq,
  inArray,
  like,
  or,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  comments,
  follows,
  likes,
  moderationActions,
  notifications,
  postAttachments,
  posts,
  reports,
  reposts,
  type InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(userId: number) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function updateProfile(userId: number, data: { username?: string; avatarUrl?: string; bio?: string; country?: string; madhhabPreference?: string }) {
  const db = await requireDb();
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export type AttachmentInput = {
  kind: "image" | "video" | "file" | "link";
  url: string;
  storageKey?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export async function createPost(userId: number, data: { content: string; visibility: "public" | "followers"; attachments: AttachmentInput[] }) {
  const db = await requireDb();
  const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!account || account.accountStatus === "banned") throw new Error("This account cannot publish posts.");
  const hashtags = (data.content.match(/(^|\s)#[A-Za-z0-9_-]+/g) ?? [])
    .map(tag => tag.trim())
    .join(" ") || null;
  const [created] = await db.insert(posts).values({
    authorId: userId,
    content: data.content,
    hashtags,
    visibility: data.visibility,
  });
  const postId = Number(created.insertId);
  if (data.attachments.length) {
    await db.insert(postAttachments).values(data.attachments.map(item => ({ postId, uploaderId: userId, ...item })));
  }
  await notifyMentions(userId, data.content, { postId });
  return postId;
}

export async function listFeed(viewerId?: number, mode: "following" | "chronological" | "trending" = "following") {
  const db = await requireDb();
  let rows;
  if (mode === "following" && viewerId) {
    const relationships = await db.select({ followingId: follows.followingId }).from(follows).where(eq(follows.followerId, viewerId));
    const authorIds = [viewerId, ...relationships.map(row => row.followingId)];
    rows = await db.select({ post: posts, author: users }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(inArray(posts.authorId, authorIds), eq(posts.moderationStatus, "published"))).orderBy(desc(posts.createdAt)).limit(40);
  } else {
    rows = await db.select({ post: posts, author: users }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(eq(posts.moderationStatus, "published")).orderBy(desc(posts.createdAt)).limit(40);
  }
  const postIds = rows.map(row => row.post.id);
  if (!postIds.length) return [];
  const [attachmentRows, likeRows, commentRows, repostRows, viewerLikeRows, viewerRepostRows] = await Promise.all([
    db.select().from(postAttachments).where(inArray(postAttachments.postId, postIds)),
    db.select({ postId: likes.postId, total: sql<number>`count(*)` }).from(likes).where(inArray(likes.postId, postIds)).groupBy(likes.postId),
    db.select({ postId: comments.postId, total: sql<number>`count(*)` }).from(comments).where(inArray(comments.postId, postIds)).groupBy(comments.postId),
    db.select({ postId: reposts.postId, total: sql<number>`count(*)` }).from(reposts).where(inArray(reposts.postId, postIds)).groupBy(reposts.postId),
    viewerId ? db.select({ postId: likes.postId }).from(likes).where(and(eq(likes.userId, viewerId), inArray(likes.postId, postIds))) : Promise.resolve([]),
    viewerId ? db.select({ postId: reposts.postId }).from(reposts).where(and(eq(reposts.userId, viewerId), inArray(reposts.postId, postIds))) : Promise.resolve([]),
  ]);
  const asNumberMap = (items: Array<{ postId: number; total: number }>) => new Map(items.map(item => [item.postId, Number(item.total)]));
  const attachmentMap = new Map<number, typeof attachmentRows>();
  attachmentRows.forEach(item => attachmentMap.set(item.postId ?? 0, [...(attachmentMap.get(item.postId ?? 0) ?? []), item]));
  const viewerLikes = new Set(viewerLikeRows.map(item => item.postId));
  const viewerReposts = new Set(viewerRepostRows.map(item => item.postId));
  const likeMap = asNumberMap(likeRows);
  const commentMap = asNumberMap(commentRows);
  const repostMap = asNumberMap(repostRows);
  const formatted = rows.map(row => ({
    ...row.post,
    author: { id: row.author.id, name: row.author.name, username: row.author.username, avatarUrl: row.author.avatarUrl, country: row.author.country, madhhabPreference: row.author.madhhabPreference },
    attachments: attachmentMap.get(row.post.id) ?? [],
    likeCount: likeMap.get(row.post.id) ?? 0,
    commentCount: commentMap.get(row.post.id) ?? 0,
    repostCount: repostMap.get(row.post.id) ?? 0,
    likedByViewer: viewerLikes.has(row.post.id),
    repostedByViewer: viewerReposts.has(row.post.id),
  }));
  return formatted;
}

async function notify(data: { recipientId: number; actorId?: number; postId?: number; commentId?: number; type: "follow" | "like" | "comment" | "repost" | "mention" | "moderation"; message: string }) {
  if (data.actorId && data.actorId === data.recipientId) return;
  const db = await requireDb();
  await db.insert(notifications).values(data);
}

async function notifyMentions(actorId: number, content: string, reference: { postId?: number; commentId?: number }) {
  const matches = content.match(/(^|\s)@([A-Za-z0-9_]+)/g) ?? [];
  const usernames = matches.map(match => match.trim().slice(1)).filter(Boolean);
  if (!usernames.length) return;
  const db = await requireDb();
  const mentioned = await db.select({ id: users.id }).from(users).where(inArray(users.username, usernames));
  await Promise.all(mentioned.map(person => notify({ recipientId: person.id, actorId, ...reference, type: "mention", message: reference.commentId ? "mentioned you in a reply" : "mentioned you in a post" })));
}

export async function toggleFollow(actorId: number, targetId: number) {
  if (actorId === targetId) throw new Error("You cannot follow yourself.");
  const db = await requireDb();
  const [existing] = await db.select().from(follows).where(and(eq(follows.followerId, actorId), eq(follows.followingId, targetId))).limit(1);
  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
    return { following: false };
  }
  await db.insert(follows).values({ followerId: actorId, followingId: targetId });
  await notify({ recipientId: targetId, actorId, type: "follow", message: "started following you" });
  return { following: true };
}

async function findPost(postId: number) {
  const db = await requireDb();
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) throw new Error("Post not found.");
  return post;
}

export async function toggleLike(userId: number, postId: number) {
  const db = await requireDb();
  const [existing] = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.postId, postId))).limit(1);
  if (existing) { await db.delete(likes).where(eq(likes.id, existing.id)); return { liked: false }; }
  const post = await findPost(postId);
  await db.insert(likes).values({ userId, postId });
  await notify({ recipientId: post.authorId, actorId: userId, postId, type: "like", message: "liked your post" });
  return { liked: true };
}

export async function toggleRepost(userId: number, postId: number) {
  const db = await requireDb();
  const [existing] = await db.select().from(reposts).where(and(eq(reposts.userId, userId), eq(reposts.postId, postId))).limit(1);
  if (existing) { await db.delete(reposts).where(eq(reposts.id, existing.id)); return { reposted: false }; }
  const post = await findPost(postId);
  await db.insert(reposts).values({ userId, postId });
  await notify({ recipientId: post.authorId, actorId: userId, postId, type: "repost", message: "reposted your post" });
  return { reposted: true };
}

export async function addComment(userId: number, postId: number, content: string) {
  const db = await requireDb();
  const post = await findPost(postId);
  const [created] = await db.insert(comments).values({ authorId: userId, postId, content });
  const commentId = Number(created.insertId);
  await notify({ recipientId: post.authorId, actorId: userId, postId, commentId, type: "comment", message: "commented on your post" });
  await notifyMentions(userId, content, { postId, commentId });
  return commentId;
}

export async function createReport(reporterId: number, postId: number, category: "scam" | "lie" | "brainrot" | "haram imagery", details?: string) {
  const db = await requireDb();
  await findPost(postId);
  await db.insert(reports).values({ reporterId, postId, category, details: details || null });
}

export async function searchCircle(query: string) {
  const db = await requireDb();
  const needle = `%${query}%`;
  const [people, matchingPosts] = await Promise.all([
    db.select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl, bio: users.bio, country: users.country, madhhabPreference: users.madhhabPreference }).from(users).where(or(like(users.name, needle), like(users.username, needle), like(users.bio, needle))).limit(20),
    db.select({ id: posts.id, content: posts.content, hashtags: posts.hashtags, createdAt: posts.createdAt, authorName: users.name, authorUsername: users.username }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(eq(posts.moderationStatus, "published"), or(like(posts.content, needle), like(posts.hashtags, needle)))).orderBy(desc(posts.createdAt)).limit(20),
  ]);
  return { people, posts: matchingPosts };
}

export async function listNotifications(userId: number) {
  const db = await requireDb();
  return db.select({ notification: notifications, actorName: users.name, actorUsername: users.username, actorAvatar: users.avatarUrl }).from(notifications).leftJoin(users, eq(notifications.actorId, users.id)).where(eq(notifications.recipientId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)));
}

export async function listOpenReports() {
  const db = await requireDb();
  return db.select({ report: reports, post: posts, reporter: users }).from(reports).innerJoin(posts, eq(reports.postId, posts.id)).innerJoin(users, eq(reports.reporterId, users.id)).where(eq(reports.status, "open")).orderBy(desc(reports.createdAt)).limit(100);
}

export async function applyModerationAction(moderatorId: number, data: { reportId: number; targetUserId: number; action: "warning" | "ban" | "remove_post" | "dismiss_report"; note?: string }) {
  const db = await requireDb();
  const [report] = await db.select().from(reports).where(eq(reports.id, data.reportId)).limit(1);
  if (!report) throw new Error("Report not found.");
  await db.transaction(async tx => {
    await tx.update(reports).set({ status: data.action === "dismiss_report" ? "dismissed" : "reviewed", reviewedAt: new Date() }).where(eq(reports.id, data.reportId));
    if (data.action === "ban") await tx.update(users).set({ accountStatus: "banned" }).where(eq(users.id, data.targetUserId));
    if (data.action === "warning") await tx.update(users).set({ accountStatus: "warned" }).where(eq(users.id, data.targetUserId));
    if (data.action === "remove_post") await tx.update(posts).set({ moderationStatus: "removed" }).where(eq(posts.id, report.postId));
    await tx.insert(moderationActions).values({ moderatorId, targetUserId: data.targetUserId, reportId: data.reportId, action: data.action, note: data.note || null });
  });
  await notify({ recipientId: data.targetUserId, actorId: moderatorId, postId: report.postId, type: "moderation", message: `A moderation action was applied: ${data.action.replace("_", " ")}` });
}
