import {
  asc,
  and,
  desc,
  eq,
  inArray,
  like,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { createHash } from "node:crypto";
import webpush from "web-push";
import {
  comments,
  aiModerationChecks,
  browserPushSubscriptions,
  communities,
  communityMembers,
  conversationParticipants,
  conversations,
  directMessages,
  friendships,
  follows,
  likes,
  moderationActions,
  notifications,
  postAttachments,
  posts,
      reports,
    reposts,
    savedPosts,

  type InsertUser,
  users,
} from "../drizzle/schema";
import { AI_MODERATION_MODEL, reviewPostWithAi } from "./aiModeration";
import { attachmentScanStatus } from "./attachmentSecurity";
import { ENV } from "./_core/env";

export function parseTlsDatabaseUrl(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!parsed.hostname || !database) throw new Error("DATABASE_URL must include a host and database name");
  const sslMode = parsed.searchParams.get("ssl-mode")?.toUpperCase();

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    // Aiven's `REQUIRED` mode encrypts the connection but does not provide a
    // CA file to Node. Certificate verification is enabled only when the URI
    // explicitly requests a verification mode and the deployment supplies one.
    ssl: { rejectUnauthorized: sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY" },
  };
}

async function createRuntimeDb() {
  if (ENV.databaseUrl) {
    if (!ENV.databaseSsl) return drizzle(ENV.databaseUrl);
    const client = await createConnection(parseTlsDatabaseUrl(ENV.databaseUrl));
    return drizzle({ client });
  }
  return null;
}

let _db: Awaited<ReturnType<typeof createRuntimeDb>> = null;

export async function getDb() {
  if (!_db) {
    try {
      _db = await createRuntimeDb();
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

export async function findUserByEmailOrUsername(email: string, username: string) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);
  return result[0];
}

export async function findUserForLogin(identifier: string) {
  const db = await requireDb();
  const result = await db
    .select()
    .from(users)
    .where(or(eq(users.email, identifier), eq(users.username, identifier)))
    .limit(1);
  return result[0];
}

export async function createLocalUser(data: {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
}) {
  const db = await requireDb();
  const created = await db.insert(users).values({
    openId: `local_${crypto.randomUUID()}`,
    name: data.name,
    username: data.username,
    email: data.email,
    passwordHash: data.passwordHash,
    loginMethod: "local",
    lastSignedIn: new Date(),
  });
  const user = await getUserById(Number(created[0].insertId));
  if (!user) throw new Error("Unable to create account.");
  return user;
}

export async function recordLocalSignIn(userId: number) {
  const db = await requireDb();
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export function assertLocalAccountDeletionAllowed(loginMethod: string | null | undefined) {
  if (loginMethod !== "local") throw new Error("هذا الحساب ليس حسابًا محليًا بالبريد واسم المستخدم وكلمة المرور، لذلك لا يمكن حذفه من هذه الصفحة.");
}

export async function deleteCurrentLocalUser(userId: number) {
  const db = await requireDb();
  const [account] = await db.select({ id: users.id, loginMethod: users.loginMethod }).from(users).where(eq(users.id, userId)).limit(1);
  assertLocalAccountDeletionAllowed(account?.loginMethod);
  await db.delete(users).where(eq(users.id, userId));
  return { deleted: true as const };
}

export async function getUserByUsername(username: string) {
  const db = await requireDb();
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}

export function assertConversationParticipant(membership: unknown[]) {
  if (!membership[0]) throw new Error("You do not have access to this conversation.");
  return membership[0];
}

async function requireConversationParticipant(userId: number, conversationId: number) {
  const db = await requireDb();
  const membership = await db
    .select()
    .from(conversationParticipants)
    .where(and(eq(conversationParticipants.userId, userId), eq(conversationParticipants.conversationId, conversationId)))
    .limit(1);
  return assertConversationParticipant(membership);
}

export async function startGroupConversation(userId: number, name: string, usernames: string[]) {
  const db = await requireDb();
  const normalized = Array.from(new Set(usernames.map(value => value.trim().replace(/^@/, "")).filter(Boolean))).filter(username => username.length >= 3);
  if (normalized.length < 2 || normalized.length > 19) throw new Error("أضف اسمَي مستخدم على الأقل وبحد أقصى 19 عضوًا.");
  const members = await Promise.all(normalized.map(username => getUserByUsername(username)));
  const validMembers = members.filter((member): member is NonNullable<typeof member> => Boolean(member && member.accountStatus !== "banned" && member.id !== userId));
  if (validMembers.length !== normalized.length) throw new Error("تأكد من أسماء المستخدمين؛ لا يمكن إضافة عضو غير موجود أو محظور.");
  const created = await db.insert(conversations).values({ kind: "group", name: name.trim().slice(0, 120) || "مجموعة الدائرة" });
  const conversationId = Number(created[0].insertId);
  await db.insert(conversationParticipants).values([{ conversationId, userId }, ...validMembers.map(member => ({ conversationId, userId: member.id }))]);
  return { conversationId, name: name.trim().slice(0, 120) || "مجموعة الدائرة", memberCount: validMembers.length + 1 };
}

export async function startDirectConversation(userId: number, targetUsername: string) {
  const db = await requireDb();
  const target = await getUserByUsername(targetUsername);
  if (!target || target.accountStatus === "banned") throw new Error("Member not found.");
  if (target.id === userId) throw new Error("You cannot start a chat with yourself.");
  const memberships = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId));
  for (const membership of memberships) {
    const other = await db
      .select({ id: conversationParticipants.id })
      .from(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, membership.conversationId), eq(conversationParticipants.userId, target.id)))
      .limit(1);
    if (other[0]) return { conversationId: membership.conversationId, target };
  }
  const created = await db.insert(conversations).values({ kind: "direct" });
  const conversationId = Number(created[0].insertId);
  await db.insert(conversationParticipants).values([{ conversationId, userId }, { conversationId, userId: target.id }]);
  return { conversationId, target };
}

export async function listDirectConversations(userId: number) {
  const db = await requireDb();
  const memberships = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId));
  const entries = await Promise.all(memberships.map(async membership => {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, membership.conversationId)).limit(1);
    const [other] = await db
      .select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl })
      .from(conversationParticipants)
      .innerJoin(users, eq(conversationParticipants.userId, users.id))
      .where(and(eq(conversationParticipants.conversationId, membership.conversationId), ne(conversationParticipants.userId, userId)))
      .limit(1);
    const [latest] = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.conversationId, membership.conversationId))
      .orderBy(desc(directMessages.createdAt))
      .limit(1);
    if (conversation?.kind === "group") {
      const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(conversationParticipants).where(eq(conversationParticipants.conversationId, membership.conversationId));
      return { conversationId: membership.conversationId, other: { id: conversation.id, name: conversation.name || "مجموعة الدائرة", username: `${Number(total)} أعضاء`, avatarUrl: null }, latest, updatedAt: latest?.createdAt ?? membership.joinedAt };
    }
    return { conversationId: membership.conversationId, other, latest, updatedAt: latest?.createdAt ?? membership.joinedAt };
  }));
  return entries.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
}

export async function listDirectMessages(userId: number, conversationId: number) {
  const db = await requireDb();
  await requireConversationParticipant(userId, conversationId);
  await db.update(conversationParticipants).set({ lastReadAt: new Date() }).where(and(eq(conversationParticipants.userId, userId), eq(conversationParticipants.conversationId, conversationId)));
  return db
    .select({ message: directMessages, senderName: users.name, senderUsername: users.username })
    .from(directMessages)
    .innerJoin(users, eq(directMessages.senderId, users.id))
    .where(eq(directMessages.conversationId, conversationId))
    .orderBy(directMessages.createdAt)
    .limit(100);
}

export async function sendDirectMessage(userId: number, conversationId: number, content: string, attachment?: { url: string; kind: "gif" | "image" | "video" | "file"; mimeType?: string }) {
  const db = await requireDb();
  await requireConversationParticipant(userId, conversationId);
  const created = await db.insert(directMessages).values({ conversationId, senderId: userId, content, attachmentUrl: attachment?.url ?? null, attachmentKind: attachment?.kind ?? null, attachmentMimeType: attachment?.mimeType ?? null });
  const recipients = await db.select({ userId: conversationParticipants.userId }).from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, conversationId), ne(conversationParticipants.userId, userId)));
  await Promise.all(recipients.map(recipient => deliverBrowserPush(recipient.userId, { title: "رسالة خاصة جديدة", body: "لديك رسالة جديدة في دائرة الأمة.", url: "/chat", tag: `message-${conversationId}` })));
  await notifyMentions(userId, content, {});
  return Number(created[0].insertId);
}

export async function deleteDirectMessage(userId: number, messageId: number) {
  const db = await requireDb();
  const [message] = await db.select().from(directMessages).where(eq(directMessages.id, messageId)).limit(1);
  if (!message) throw new Error("هذه الرسالة غير موجودة.");
  if (message.senderId !== userId) throw new Error("لا يمكنك حذف رسالة كتبها عضو آخر.");
  await db.delete(directMessages).where(and(eq(directMessages.id, messageId), eq(directMessages.senderId, userId)));
  return { deleted: true as const };
}

export async function deleteDirectConversation(userId: number, conversationId: number) {
  const db = await requireDb();
  await requireConversationParticipant(userId, conversationId);
  await db.delete(conversationParticipants).where(and(eq(conversationParticipants.userId, userId), eq(conversationParticipants.conversationId, conversationId)));
  return { deleted: true as const };
}

export async function updateProfile(userId: number, data: { username?: string; avatarUrl?: string; bio?: string; country?: string; madhhabPreference?: string; profileVisibility?: "public" | "friends" }) {
  const db = await requireDb();
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

async function getMemberCommunityIds(userId?: number) {
  if (!userId) return new Set<number>();
  const db = await requireDb();
  const memberships = await db.select({ communityId: communityMembers.communityId }).from(communityMembers).where(eq(communityMembers.userId, userId));
  return new Set(memberships.map(item => item.communityId));
}

async function getCommunityMembership(userId: number, communityId: number) {
  const db = await requireDb();
  const [membership] = await db.select().from(communityMembers).where(and(eq(communityMembers.userId, userId), eq(communityMembers.communityId, communityId))).limit(1);
  return membership;
}

async function getCommunityOrThrow(communityId: number) {
  const db = await requireDb();
  const [community] = await db.select().from(communities).where(eq(communities.id, communityId)).limit(1);
  if (!community) throw new Error("هذه المساحة غير موجودة.");
  return community;
}

export async function assertCommunityAccess(viewerId: number | undefined, communityId: number) {
  const community = await getCommunityOrThrow(communityId);
  const membership = viewerId ? await getCommunityMembership(viewerId, communityId) : undefined;
  if (community.visibility === "members" && !membership) throw new Error("هذه المساحة متاحة لأعضائها فقط.");
  return { community, membership };
}

async function assertCommunityMembership(userId: number, communityId: number) {
  const membership = await getCommunityMembership(userId, communityId);
  if (!membership) throw new Error("انضم إلى هذه المساحة قبل النشر فيها.");
  return membership;
}

export async function createCommunity(userId: number, data: { name: string; slug: string; description: string; kind: "community" | "group" | "channel"; parentId?: number; visibility: "public" | "members" }) {
  const db = await requireDb();
  let parent: typeof communities.$inferSelect | undefined;
  if (data.parentId) {
    parent = await getCommunityOrThrow(data.parentId);
    if (parent.parentId) throw new Error("يمكن إنشاء مستوى واحد فقط من المساحات الفرعية.");
    if (parent.visibility === "members") await assertCommunityMembership(userId, parent.id);
  }
  const [duplicate] = await db.select({ id: communities.id }).from(communities).where(eq(communities.slug, data.slug)).limit(1);
  if (duplicate) throw new Error("هذا الرابط المختصر مستخدم بالفعل.");
  const [created] = await db.insert(communities).values({
    name: data.name,
    slug: data.slug,
    description: data.description,
    kind: parent ? "subcommunity" : data.kind,
    parentId: parent?.id ?? null,
    visibility: parent?.visibility === "members" ? "members" : data.visibility,
    creatorId: userId,
  });
  const communityId = Number(created.insertId);
  await db.insert(communityMembers).values({ communityId, userId, role: "owner" });
  return { communityId };
}

export async function listCommunities(viewerId?: number) {
  const db = await requireDb();
  const [rows, counts, membershipIds] = await Promise.all([
    db.select().from(communities).orderBy(desc(communities.createdAt)).limit(100),
    db.select({ communityId: communityMembers.communityId, total: sql<number>`count(*)` }).from(communityMembers).groupBy(communityMembers.communityId),
    getMemberCommunityIds(viewerId),
  ]);
  const countMap = new Map(counts.map(item => [item.communityId, Number(item.total)]));
  return rows
    .filter(community => community.visibility === "public" || membershipIds.has(community.id))
    .map(community => ({ ...community, memberCount: countMap.get(community.id) ?? 0, joined: membershipIds.has(community.id) }));
}

export async function getCommunityDetails(viewerId: number | undefined, slug: string) {
  const db = await requireDb();
  const [community] = await db.select().from(communities).where(eq(communities.slug, slug)).limit(1);
  if (!community) throw new Error("هذه المساحة غير موجودة.");
  const membership = viewerId ? await getCommunityMembership(viewerId, community.id) : undefined;
  if (community.visibility === "members" && !membership) throw new Error("هذه المساحة متاحة لأعضائها فقط.");
  const [memberRows, subcommunities, membershipIds] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(communityMembers).where(eq(communityMembers.communityId, community.id)),
    db.select().from(communities).where(eq(communities.parentId, community.id)).orderBy(desc(communities.createdAt)),
    getMemberCommunityIds(viewerId),
  ]);
  return {
    community,
    memberCount: Number(memberRows[0]?.total ?? 0),
    membership: membership ?? null,
    subcommunities: subcommunities.filter(item => item.visibility === "public" || membershipIds.has(item.id)),
  };
}

export async function joinCommunity(userId: number, communityId: number) {
  const db = await requireDb();
  const community = await getCommunityOrThrow(communityId);
  if (community.parentId) {
    const parent = await getCommunityOrThrow(community.parentId);
    if (parent.visibility === "members") await assertCommunityMembership(userId, parent.id);
  }
  const existing = await getCommunityMembership(userId, communityId);
  if (existing) return { joined: true as const, role: existing.role };
  await db.insert(communityMembers).values({ communityId, userId, role: "member" });
  return { joined: true as const, role: "member" as const };
}

export async function leaveCommunity(userId: number, communityId: number) {
  const membership = await getCommunityMembership(userId, communityId);
  if (!membership) return { joined: false as const };
  if (membership.role === "owner") throw new Error("لا يمكن لمالك المساحة مغادرتها. انقل الملكية أولًا.");
  const db = await requireDb();
  await db.delete(communityMembers).where(eq(communityMembers.id, membership.id));
  return { joined: false as const };
}

export type AttachmentInput = {
  kind: "image" | "gif" | "video" | "file" | "link";
  url: string;
  storageKey?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export async function createPost(userId: number, data: { title?: string; content: string; textStyle: "default" | "serif" | "emphasis"; visibility: "public" | "friends"; attachments: AttachmentInput[]; communityId?: number }) {
  const db = await requireDb();
  const [account] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!account || account.accountStatus === "banned") throw new Error("This account cannot publish posts.");
  const hashtags = (data.content.match(/(^|\s)#[A-Za-z0-9_\-\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g) ?? [])
    .map(tag => tag.trim())
    .join(" ") || null;
  if (data.communityId) await assertCommunityMembership(userId, data.communityId);
  const verdict = await reviewPostWithAi({ title: data.title, content: data.content, attachmentKinds: data.attachments.map(attachment => attachment.kind) });
  const moderationStatus = verdict.action === "review" ? "under_review" : "published" as const;
  const [created] = await db.insert(posts).values({
    authorId: userId,
    communityId: data.communityId ?? null,
    title: data.title?.trim() || null,
    content: data.content,
    textStyle: data.textStyle,
    hashtags,
    visibility: data.visibility,
    moderationStatus,
  });
  const postId = Number(created.insertId);
  await db.insert(aiModerationChecks).values({
    postId,
    source: verdict.source,
    model: verdict.source === "ai" ? AI_MODERATION_MODEL : null,
    action: moderationStatus,
    category: verdict.category,
    confidence: Math.round(verdict.confidence * 100),
    rationale: verdict.rationale,
    creatorMessage: verdict.userMessage,
  });
  if (data.attachments.length) {
    await db.insert(postAttachments).values(data.attachments.map(item => ({
      postId,
      uploaderId: userId,
      ...item,
      scanStatus: attachmentScanStatus(item.filename, item.mimeType),
    })));
  }
  if (moderationStatus === "published") {
    await notifyMentions(userId, data.content, { postId });
  } else {
    await notify({ recipientId: userId, postId, type: "moderation", message: verdict.userMessage });
  }
  return { postId, moderation: { status: moderationStatus, category: verdict.category, message: verdict.userMessage, source: verdict.source } };
}

export async function getPostAttachmentScanStatus(storageKey: string) {
  const db = await requireDb();
  const [attachment] = await db
    .select({ scanStatus: postAttachments.scanStatus })
    .from(postAttachments)
    .where(eq(postAttachments.storageKey, storageKey))
    .limit(1);
  return attachment?.scanStatus ?? null;
}

export async function isPostAttachmentStored(storageKey: string) {
  const db = await requireDb();
  const [attachment] = await db
    .select({ id: postAttachments.id })
    .from(postAttachments)
    .where(eq(postAttachments.storageKey, storageKey))
    .limit(1);
  return Boolean(attachment);
}

export async function updatePendingAttachmentScanStatus(storageKey: string, scanStatus: "clean" | "blocked") {
  const db = await requireDb();
  const result = await db
    .update(postAttachments)
    .set({ scanStatus })
    .where(and(eq(postAttachments.storageKey, storageKey), eq(postAttachments.scanStatus, "pending")));
  return Number(result[0].affectedRows ?? 0) > 0;
}

export async function listMyPosts(authorId: number) {
  const db = await requireDb();
  const mine = await db.select().from(posts).where(eq(posts.authorId, authorId)).orderBy(desc(posts.createdAt)).limit(50);
  if (!mine.length) return [];
  const postIds = mine.map(post => post.id);
  const [attachmentRows, likeRows, commentRows, repostRows] = await Promise.all([
    db.select().from(postAttachments).where(inArray(postAttachments.postId, postIds)),
    db.select({ postId: likes.postId, total: sql<number>`count(*)` }).from(likes).where(inArray(likes.postId, postIds)).groupBy(likes.postId),
    db.select({ postId: comments.postId, total: sql<number>`count(*)` }).from(comments).where(inArray(comments.postId, postIds)).groupBy(comments.postId),
    db.select({ postId: reposts.postId, total: sql<number>`count(*)` }).from(reposts).where(inArray(reposts.postId, postIds)).groupBy(reposts.postId),
  ]);
  const attachmentMap = new Map<number, typeof attachmentRows>();
  attachmentRows.forEach(item => attachmentMap.set(item.postId ?? 0, [...(attachmentMap.get(item.postId ?? 0) ?? []), item]));
  const countMap = (rows: Array<{ postId: number; total: number }>) => new Map(rows.map(row => [row.postId, Number(row.total)]));
  const likeMap = countMap(likeRows); const commentMap = countMap(commentRows); const repostMap = countMap(repostRows);
  return mine.map(post => ({ ...post, attachments: attachmentMap.get(post.id) ?? [], likeCount: likeMap.get(post.id) ?? 0, commentCount: commentMap.get(post.id) ?? 0, repostCount: repostMap.get(post.id) ?? 0 }));
}

export function assertPostOwnership<T extends { id: number }>(post: T | undefined): T {
  if (!post) throw new Error("لا يمكنك إدارة إلا منشورك أنت.");
  return post;
}

export function assertReportablePost<T extends { authorId: number }>(post: T, reporterId: number): T {
  if (post.authorId === reporterId) throw new Error("لا يمكنك الإبلاغ عن منشورك أنت.");
  return post;
}

export async function deletePostByAuthor(authorId: number, postId: number) {
  const db = await requireDb();
  const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, postId), eq(posts.authorId, authorId))).limit(1);
  assertPostOwnership(post);
  await db.delete(posts).where(eq(posts.id, postId));
  return { deleted: true as const, postId };
}

export async function updatePostByAuthor(authorId: number, postId: number, data: { content?: string; visibility?: "public" | "friends" }) {
  const db = await requireDb();
  const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, postId), eq(posts.authorId, authorId))).limit(1);
  assertPostOwnership(post);
  const values: { content?: string; visibility?: "public" | "friends"; hashtags?: string | null } = {};
  if (data.content !== undefined) {
    values.content = data.content;
    values.hashtags = (data.content.match(/(^|\s)#[A-Za-z0-9_\-\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g) ?? []).map(tag => tag.trim()).join(" ") || null;
  }
  if (data.visibility !== undefined) values.visibility = data.visibility;
  if (!Object.keys(values).length) throw new Error("لم تُحدَّد تغييرات للمنشور.");
  await db.update(posts).set(values).where(and(eq(posts.id, postId), eq(posts.authorId, authorId)));
  return { updated: true as const, postId };
}

export async function toggleSavedPost(userId: number, postId: number) {
  const db = await requireDb();
  const [post] = await db.select().from(posts).where(and(eq(posts.id, postId), eq(posts.moderationStatus, "published"))).limit(1);
  if (!post) throw new Error("هذا المنشور غير متاح.");
  await assertCanAccessPost(userId, post);
  const [existing] = await db.select({ id: savedPosts.id }).from(savedPosts).where(and(eq(savedPosts.userId, userId), eq(savedPosts.postId, postId))).limit(1);
  if (existing) {
    await db.delete(savedPosts).where(and(eq(savedPosts.userId, userId), eq(savedPosts.postId, postId)));
    return { saved: false as const, postId };
  }
  await db.insert(savedPosts).values({ userId, postId });
  return { saved: true as const, postId };
}

export async function listSavedPosts(userId: number) {
  const db = await requireDb();
  const rows = await db
    .select({ savedAt: savedPosts.createdAt, post: posts, author: users })
    .from(savedPosts)
    .innerJoin(posts, eq(savedPosts.postId, posts.id))
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(savedPosts.userId, userId), eq(posts.moderationStatus, "published")))
    .orderBy(desc(savedPosts.createdAt))
    .limit(100);
  const friendIds = await getFriendIds(userId);
  return rows.filter(row => row.post.visibility === "public" || row.post.authorId === userId || friendIds.has(row.post.authorId)).map(row => ({
    ...row.post,
    savedAt: row.savedAt,
    author: { id: row.author.id, name: row.author.name, username: row.author.username, avatarUrl: row.author.avatarUrl },
    savedByViewer: true as const,
  }));
}

export async function getFriendIds(userId: number) {
  const db = await requireDb();
  const links = await db.select().from(friendships).where(and(eq(friendships.status, "accepted"), or(eq(friendships.requesterId, userId), eq(friendships.recipientId, userId))));
  return new Set(links.map(link => link.requesterId === userId ? link.recipientId : link.requesterId));
}

async function assertCanAccessPost(viewerId: number | undefined, post: typeof posts.$inferSelect) {
  if (post.visibility === "public" || post.authorId === viewerId) return;
  if (!viewerId) throw new Error("هذا المنشور مخصص للأصدقاء فقط.");
  const friendIds = await getFriendIds(viewerId);
  if (!friendIds.has(post.authorId)) throw new Error("هذا المنشور مخصص للأصدقاء فقط.");
}

export function interleaveFeedAuthors<T extends { post: { authorId: number } }>(rows: T[]) {
  const remaining = [...rows];
  const ordered: T[] = [];
  let previousAuthorId: number | undefined;
  while (remaining.length) {
    const nextIndex = remaining.findIndex(row => row.post.authorId !== previousAuthorId);
    const [next] = remaining.splice(nextIndex >= 0 ? nextIndex : 0, 1);
    ordered.push(next);
    previousAuthorId = next.post.authorId;
  }
  return ordered;
}

export async function listFeed(viewerId?: number, mode: "following" | "chronological" | "balanced" = "following", mediaType?: "image" | "gif" | "video" | "file" | "link", visibilityScope: "all" | "public" = "all") {
  const db = await requireDb();
  let rows;
  if (mode === "following" && viewerId) {
    const relationships = await db.select({ followingId: follows.followingId }).from(follows).where(eq(follows.followerId, viewerId));
    const authorIds = [viewerId, ...relationships.map(row => row.followingId)];
    rows = await db.select({ post: posts, author: users }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(inArray(posts.authorId, authorIds), eq(posts.moderationStatus, "published"))).orderBy(desc(posts.createdAt)).limit(80);
  } else {
    rows = await db.select({ post: posts, author: users }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(eq(posts.moderationStatus, "published")).orderBy(desc(posts.createdAt)).limit(80);
  }
  if (mode === "balanced") rows = interleaveFeedAuthors(rows);
  const friendIds = viewerId ? await getFriendIds(viewerId) : new Set<number>();
  rows = rows.filter(row => row.post.visibility === "public" || (viewerId !== undefined && (row.post.authorId === viewerId || friendIds.has(row.post.authorId)))).slice(0, 40);
  const postIds = rows.map(row => row.post.id);
  if (!postIds.length) return [];
  const [attachmentRows, likeRows, commentRows, repostRows, viewerLikeRows, viewerRepostRows, viewerSavedRows] = await Promise.all([
    db.select().from(postAttachments).where(inArray(postAttachments.postId, postIds)),
    db.select({ postId: likes.postId, total: sql<number>`count(*)` }).from(likes).where(inArray(likes.postId, postIds)).groupBy(likes.postId),
    db.select({ postId: comments.postId, total: sql<number>`count(*)` }).from(comments).where(inArray(comments.postId, postIds)).groupBy(comments.postId),
    db.select({ postId: reposts.postId, total: sql<number>`count(*)` }).from(reposts).where(inArray(reposts.postId, postIds)).groupBy(reposts.postId),
    viewerId ? db.select({ postId: likes.postId }).from(likes).where(and(eq(likes.userId, viewerId), inArray(likes.postId, postIds))) : Promise.resolve([]),
    viewerId ? db.select({ postId: reposts.postId }).from(reposts).where(and(eq(reposts.userId, viewerId), inArray(reposts.postId, postIds))) : Promise.resolve([]),
    viewerId ? db.select({ postId: savedPosts.postId }).from(savedPosts).where(and(eq(savedPosts.userId, viewerId), inArray(savedPosts.postId, postIds))) : Promise.resolve([]),
  ]);
  const asNumberMap = (items: Array<{ postId: number; total: number }>) => new Map(items.map(item => [item.postId, Number(item.total)]));
  const attachmentMap = new Map<number, typeof attachmentRows>();
  attachmentRows.forEach(item => attachmentMap.set(item.postId ?? 0, [...(attachmentMap.get(item.postId ?? 0) ?? []), item]));
  const viewerLikes = new Set(viewerLikeRows.map(item => item.postId));
  const viewerReposts = new Set(viewerRepostRows.map(item => item.postId));
  const viewerSaved = new Set(viewerSavedRows.map(item => item.postId));
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
    savedByViewer: viewerSaved.has(row.post.id),
  }));
  const mediaFiltered = mediaType ? formatted.filter(post => post.attachments.some(attachment => attachment.kind === mediaType)) : formatted;
  return visibilityScope === "public" ? mediaFiltered.filter(post => post.visibility === "public") : mediaFiltered;
}

export async function listCommunityFeed(viewerId: number | undefined, communityId: number) {
  const db = await requireDb();
  await assertCommunityAccess(viewerId, communityId);
  const rows = await db
    .select({ post: posts, author: users })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.communityId, communityId), eq(posts.moderationStatus, "published")))
    .orderBy(desc(posts.createdAt))
    .limit(40);
  const friendIds = viewerId ? await getFriendIds(viewerId) : new Set<number>();
  const visibleRows = rows.filter(row => row.post.visibility === "public" || (viewerId !== undefined && (row.post.authorId === viewerId || friendIds.has(row.post.authorId))));
  const postIds = visibleRows.map(row => row.post.id);
  if (!postIds.length) return [];
  const [attachmentRows, likeRows, commentRows, repostRows, viewerLikeRows, viewerRepostRows, viewerSavedRows] = await Promise.all([
    db.select().from(postAttachments).where(inArray(postAttachments.postId, postIds)),
    db.select({ postId: likes.postId, total: sql<number>`count(*)` }).from(likes).where(inArray(likes.postId, postIds)).groupBy(likes.postId),
    db.select({ postId: comments.postId, total: sql<number>`count(*)` }).from(comments).where(inArray(comments.postId, postIds)).groupBy(comments.postId),
    db.select({ postId: reposts.postId, total: sql<number>`count(*)` }).from(reposts).where(inArray(reposts.postId, postIds)).groupBy(reposts.postId),
    viewerId ? db.select({ postId: likes.postId }).from(likes).where(and(eq(likes.userId, viewerId), inArray(likes.postId, postIds))) : Promise.resolve([]),
    viewerId ? db.select({ postId: reposts.postId }).from(reposts).where(and(eq(reposts.userId, viewerId), inArray(reposts.postId, postIds))) : Promise.resolve([]),
    viewerId ? db.select({ postId: savedPosts.postId }).from(savedPosts).where(and(eq(savedPosts.userId, viewerId), inArray(savedPosts.postId, postIds))) : Promise.resolve([]),
  ]);
  const asNumberMap = (items: Array<{ postId: number; total: number }>) => new Map(items.map(item => [item.postId, Number(item.total)]));
  const attachmentMap = new Map<number, typeof attachmentRows>();
  attachmentRows.forEach(item => attachmentMap.set(item.postId ?? 0, [...(attachmentMap.get(item.postId ?? 0) ?? []), item]));
  const likeMap = asNumberMap(likeRows);
  const commentMap = asNumberMap(commentRows);
  const repostMap = asNumberMap(repostRows);
  const viewerLikes = new Set(viewerLikeRows.map(item => item.postId));
  const viewerReposts = new Set(viewerRepostRows.map(item => item.postId));
  const viewerSaved = new Set(viewerSavedRows.map(item => item.postId));
  return visibleRows.map(row => ({
    ...row.post,
    author: { id: row.author.id, name: row.author.name, username: row.author.username, avatarUrl: row.author.avatarUrl, country: row.author.country, madhhabPreference: row.author.madhhabPreference },
    attachments: attachmentMap.get(row.post.id) ?? [],
    likeCount: likeMap.get(row.post.id) ?? 0,
    commentCount: commentMap.get(row.post.id) ?? 0,
    repostCount: repostMap.get(row.post.id) ?? 0,
    likedByViewer: viewerLikes.has(row.post.id),
    repostedByViewer: viewerReposts.has(row.post.id),
    savedByViewer: viewerSaved.has(row.post.id),
  }));
}

async function notify(data: { recipientId: number; actorId?: number; postId?: number; commentId?: number; type: "follow" | "like" | "comment" | "repost" | "mention" | "moderation"; message: string }) {
  if (data.actorId && data.actorId === data.recipientId) return;
  const db = await requireDb();
  await db.insert(notifications).values(data);
}

export function getBrowserPushStatus() {
  return { available: Boolean(ENV.vapidPublicKey && ENV.vapidPrivateKey), publicKey: ENV.vapidPublicKey || undefined };
}

export async function getBrowserPushSubscriptionStatus(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ id: browserPushSubscriptions.id }).from(browserPushSubscriptions).where(eq(browserPushSubscriptions.userId, userId)).limit(1);
  return { ...getBrowserPushStatus(), subscribed: Boolean(rows[0]) };
}

export async function saveBrowserPushSubscription(userId: number, subscription: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) {
  const db = await requireDb();
  const endpointHash = createHash("sha256").update(subscription.endpoint).digest("hex");
  await db.insert(browserPushSubscriptions).values({ userId, endpointHash, endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth, userAgent: subscription.userAgent || null }).onDuplicateKeyUpdate({ set: { userId, endpoint: subscription.endpoint, p256dh: subscription.p256dh, auth: subscription.auth, userAgent: subscription.userAgent || null, updatedAt: new Date() } });
  return { saved: true as const };
}

export async function removeBrowserPushSubscription(userId: number, endpoint?: string) {
  const db = await requireDb();
  if (endpoint) {
    const endpointHash = createHash("sha256").update(endpoint).digest("hex");
    await db.delete(browserPushSubscriptions).where(and(eq(browserPushSubscriptions.userId, userId), eq(browserPushSubscriptions.endpointHash, endpointHash)));
  } else {
    await db.delete(browserPushSubscriptions).where(eq(browserPushSubscriptions.userId, userId));
  }
  return { removed: true as const };
}

async function deliverBrowserPush(recipientId: number, payload: { title: string; body: string; url: string; tag: string }) {
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) return;
  const db = await requireDb();
  const subscriptions = await db.select().from(browserPushSubscriptions).where(eq(browserPushSubscriptions.userId, recipientId));
  if (!subscriptions.length) return;
  webpush.setVapidDetails(ENV.vapidSubject, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  await Promise.all(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload), { TTL: 300, urgency: "normal" });
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await db.delete(browserPushSubscriptions).where(eq(browserPushSubscriptions.id, subscription.id));
      else console.warn("[Browser push] Delivery failed", error);
    }
  }));
}

async function notifyMentions(actorId: number, content: string, reference: { postId?: number; commentId?: number }) {
  const matches = content.match(/(^|\s)@([^\s@]{3,32})/g) ?? [];
  const usernames = matches.map(match => match.trim().slice(1)).filter(Boolean);
  if (!usernames.length) return;
  const db = await requireDb();
  const mentioned = await db.select({ id: users.id }).from(users).where(inArray(users.username, usernames));
  await Promise.all(mentioned.map(async person => {
    await notify({ recipientId: person.id, actorId, ...reference, type: "mention", message: reference.commentId ? "ذكرك في رد" : reference.postId ? "ذكرك في منشور" : "ذكرك في رسالة خاصة" });
    await deliverBrowserPush(person.id, { title: "إشارة جديدة في دائرة الأمة", body: "تمت الإشارة إليك في محتوى جديد.", url: reference.postId ? "/" : "/chat", tag: `mention-${person.id}-${reference.postId ?? "message"}` });
  }));
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
  await notify({ recipientId: targetId, actorId, type: "follow", message: "بدأ بمتابعتك" });
  return { following: true };
}

export async function listFriendships(userId: number) {
  const db = await requireDb();
  const links = await db.select().from(friendships).where(or(eq(friendships.requesterId, userId), eq(friendships.recipientId, userId))).orderBy(desc(friendships.updatedAt));
  const rows = await Promise.all(links.map(async link => {
    const peerId = link.requesterId === userId ? link.recipientId : link.requesterId;
    const peer = await getUserById(peerId);
    return { ...link, direction: link.requesterId === userId ? "outgoing" as const : "incoming" as const, peer };
  }));
  return rows.filter(row => row.peer);
}

export async function requestFriendship(requesterId: number, recipientId: number) {
  if (requesterId === recipientId) throw new Error("You cannot add yourself as a friend.");
  const db = await requireDb();
  const target = await getUserById(recipientId);
  if (!target || target.accountStatus === "banned") throw new Error("Member not found.");
  const [existing] = await db.select().from(friendships).where(or(and(eq(friendships.requesterId, requesterId), eq(friendships.recipientId, recipientId)), and(eq(friendships.requesterId, recipientId), eq(friendships.recipientId, requesterId)))).limit(1);
  if (existing?.status === "accepted") return { status: "accepted" as const, friendshipId: existing.id };
  if (existing?.status === "pending" && existing.recipientId === requesterId) {
    await db.update(friendships).set({ status: "accepted", updatedAt: new Date() }).where(eq(friendships.id, existing.id));
    return { status: "accepted" as const, friendshipId: existing.id };
  }
  if (existing) {
    await db.update(friendships).set({ requesterId, recipientId, status: "pending", updatedAt: new Date() }).where(eq(friendships.id, existing.id));
    await notify({ recipientId, actorId: requesterId, type: "follow", message: "أرسل لك طلب صداقة — افتح ملفك لقبوله أو رفضه." });
    return { status: "pending" as const, friendshipId: existing.id };
  }
  const created = await db.insert(friendships).values({ requesterId, recipientId, status: "pending" });
  await notify({ recipientId, actorId: requesterId, type: "follow", message: "أرسل لك طلب صداقة — افتح ملفك لقبوله أو رفضه." });
  await deliverBrowserPush(recipientId, { title: "طلب صداقة جديد", body: "لديك طلب صداقة جديد في دائرة الأمة.", url: "/profile", tag: `friendship-${recipientId}` });
  return { status: "pending" as const, friendshipId: Number(created[0].insertId) };
}

export async function respondToFriendship(recipientId: number, friendshipId: number, response: "accepted" | "rejected") {
  const db = await requireDb();
  const [request] = await db.select().from(friendships).where(and(eq(friendships.id, friendshipId), eq(friendships.recipientId, recipientId), eq(friendships.status, "pending"))).limit(1);
  if (!request) throw new Error("Friend request not found.");
  await db.update(friendships).set({ status: response, updatedAt: new Date() }).where(eq(friendships.id, friendshipId));
  return { status: response, friendshipId };
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
  await assertCanAccessPost(userId, post);
  await db.insert(likes).values({ userId, postId });
  await notify({ recipientId: post.authorId, actorId: userId, postId, type: "like", message: "أعجب بمنشورك" });
  return { liked: true };
}

export async function toggleRepost(userId: number, postId: number) {
  const db = await requireDb();
  const [existing] = await db.select().from(reposts).where(and(eq(reposts.userId, userId), eq(reposts.postId, postId))).limit(1);  if (existing) { await db.delete(reposts).where(eq(reposts.id, existing.id)); return { reposted: false }; }
  const post = await findPost(postId);
  await assertCanAccessPost(userId, post);
  await db.insert(reposts).values({ userId, postId });
  await notify({ recipientId: post.authorId, actorId: userId, postId, type: "repost", message: "أعاد نشر منشورك" });
  return { reposted: true };
}

export async function addComment(userId: number, postId: number, content: string) {
  const db = await requireDb();
  const post = await findPost(postId);
  await assertCanAccessPost(userId, post);
  if (post.communityId) await assertCommunityMembership(userId, post.communityId);
  const [created] = await db.insert(comments).values({ authorId: userId, postId, content });
  const commentId = Number(created.insertId);
  await notify({ recipientId: post.authorId, actorId: userId, postId, commentId, type: "comment", message: "كتب تعليقًا على منشورك" });
  await deliverBrowserPush(post.authorId, { title: "رد جديد على منشورك", body: "كتب أحد الأعضاء ردًا على منشورك.", url: "/", tag: `reply-${postId}` });
  await notifyMentions(userId, content, { postId, commentId });
  return commentId;
}

export async function listPostComments(viewerId: number | undefined, postId: number) {
  const db = await requireDb();
  const post = await findPost(postId);
  await assertCanAccessPost(viewerId, post);
  if (post.communityId) await assertCommunityAccess(viewerId, post.communityId);
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      authorId: users.id,
      authorName: users.name,
      authorUsername: users.username,
      authorAvatarUrl: users.avatarUrl,
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(asc(comments.createdAt))
    .limit(100);
  return rows.map(row => ({
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    author: { id: row.authorId, name: row.authorName, username: row.authorUsername, avatarUrl: row.authorAvatarUrl },
  }));
}

export async function createReport(reporterId: number, postId: number, category: "scam" | "lie" | "brainrot" | "haram imagery", details?: string) {
  const db = await requireDb();
  const post = await findPost(postId);
  assertReportablePost(post, reporterId);
  const [created] = await db.insert(reports).values({ reporterId, postId, category, details: details || null });
  return { reportId: Number(created.insertId), postId };
}

export async function searchCircle(query: string, viewerId?: number) {
  const db = await requireDb();
  const needle = `%${query}%`;
  const friendIds = viewerId ? await getFriendIds(viewerId) : new Set<number>();
  const [people, matchingPosts] = await Promise.all([
    db.select({ id: users.id, name: users.name, username: users.username, avatarUrl: users.avatarUrl, bio: users.bio, country: users.country, madhhabPreference: users.madhhabPreference, profileVisibility: users.profileVisibility }).from(users).where(or(like(users.name, needle), like(users.username, needle), like(users.bio, needle))).limit(20),
    db.select({ id: posts.id, authorId: posts.authorId, visibility: posts.visibility, content: posts.content, hashtags: posts.hashtags, createdAt: posts.createdAt, authorName: users.name, authorUsername: users.username }).from(posts).innerJoin(users, eq(posts.authorId, users.id)).where(and(eq(posts.moderationStatus, "published"), or(like(posts.content, needle), like(posts.hashtags, needle)))).orderBy(desc(posts.createdAt)).limit(20),
  ]);
  const canViewAuthor = (authorId: number, visibility: "public" | "friends") => visibility === "public" || (viewerId !== undefined && (authorId === viewerId || friendIds.has(authorId)));
  return {
    people: people.filter(person => canViewAuthor(person.id, person.profileVisibility)).map(({ profileVisibility: _profileVisibility, ...person }) => person),
    posts: matchingPosts.filter(post => canViewAuthor(post.authorId, post.visibility)).map(({ authorId: _authorId, visibility: _visibility, ...post }) => post),
  };
}

export async function listNotifications(userId: number) {
  const db = await requireDb();
  return db.select({ notification: notifications, actorName: users.name, actorUsername: users.username, actorAvatar: users.avatarUrl }).from(notifications).leftJoin(users, eq(notifications.actorId, users.id)).where(eq(notifications.recipientId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)));
}

export async function deleteNotification(userId: number, notificationId: number) {
  const db = await requireDb();
  await db.delete(notifications).where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)));
  return { deleted: true as const };
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
