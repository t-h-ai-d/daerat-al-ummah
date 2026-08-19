import type { FeedPost } from "@/pages/Home";
import { describe, expect, it } from "vitest";
import { findApprovedVideoAttachment, selectVideoPosts, videoFeedInput } from "./videoPresentation";

function post(id: number, attachment: FeedPost["attachments"][number], title = "درس نافع"): FeedPost {
  return {
    id,
    author: { id: 5, name: "عضو", username: "member", avatarUrl: null },
    title,
    content: "وصف مختصر",
    hashtags: "#علم",
    textStyle: "default",
    visibility: "public",
    createdAt: new Date("2026-08-19T00:00:00.000Z"),
    attachments: [attachment],
    likeCount: 0,
    commentCount: 0,
    repostCount: 0,
    likedByViewer: false,
    repostedByViewer: false,
    savedByViewer: false,
  };
}

describe("video presentation", () => {
  it("uses only approved video attachments", () => {
    expect(findApprovedVideoAttachment([{ kind: "video", url: "https://example.test/video.mp4", scanStatus: "clean" }])?.url).toBe("https://example.test/video.mp4");
    expect(findApprovedVideoAttachment([{ kind: "video", url: "https://example.test/pending.mp4", scanStatus: "pending" }])).toBeUndefined();
    expect(findApprovedVideoAttachment([{ kind: "image", url: "https://example.test/image.webp", scanStatus: "clean" }])).toBeUndefined();
  });

  it("filters actual videos by text and keeps the video rail finite", () => {
    const video = { kind: "video" as const, url: "https://example.test/video.mp4", scanStatus: "clean" as const };
    const image = { kind: "image" as const, url: "https://example.test/image.webp", scanStatus: "clean" as const };
    const posts = Array.from({ length: 14 }, (_, index) => post(index + 1, video, index % 2 ? "درس في التفسير" : "حلقة في الأخلاق"));
    posts.push(post(99, image, "درس في التفسير"));

    expect(selectVideoPosts(posts, "التفسير")).toHaveLength(7);
    expect(selectVideoPosts(posts, "")).toHaveLength(12);
    expect(selectVideoPosts(posts, "لا شيء")).toEqual([]);
  });

  it("uses the existing following feed only for a signed-in subscriptions view", () => {
    expect(videoFeedInput("all", false)).toEqual({ mode: "chronological", visibilityScope: "public" });
    expect(videoFeedInput("following", false)).toEqual({ mode: "chronological", visibilityScope: "public" });
    expect(videoFeedInput("following", true)).toEqual({ mode: "following", visibilityScope: "all" });
  });
});
