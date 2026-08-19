import type { Attachment, FeedPost } from "@/pages/Home";

export function findApprovedVideoAttachment(attachments: Attachment[]): Attachment | undefined {
  return attachments.find(attachment => attachment.kind === "video" && (!attachment.scanStatus || attachment.scanStatus === "clean"));
}

export function selectVideoPosts(posts: FeedPost[], search: string, limit = 12): FeedPost[] {
  const normalised = search.trim().toLocaleLowerCase();
  const actualVideos = posts.filter(post => Boolean(findApprovedVideoAttachment(post.attachments)));
  const matched = normalised
    ? actualVideos.filter(post => [post.title, post.content, post.hashtags, post.author.name, post.author.username].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalised))
    : actualVideos;
  return matched.slice(0, limit);
}

export type VideoScope = "all" | "following";

export function videoFeedInput(scope: VideoScope, isAuthenticated: boolean) {
  return {
    mode: isAuthenticated && scope === "following" ? "following" as const : "chronological" as const,
    visibilityScope: isAuthenticated ? "all" as const : "public" as const,
  };
}
