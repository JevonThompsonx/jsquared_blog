import { describe, expect, it } from "vitest";

import {
  createCommentSchema,
  moderateCommentsSchema,
  postCommentsParamsSchema,
} from "@/server/forms/comments";

describe("comment form schemas", () => {
  it("accepts text ids for post params and moderation payloads", () => {
    expect(postCommentsParamsSchema.parse({ postId: "post_123" })).toEqual({ postId: "post_123" });
    expect(
      moderateCommentsSchema.parse({
        commentIds: ["comment_123", "comment-456"],
        action: "hide",
      }),
    ).toEqual({
      commentIds: ["comment_123", "comment-456"],
      action: "hide",
    });
  });

  it("rejects invalid text ids", () => {
    expect(postCommentsParamsSchema.safeParse({ postId: "" }).success).toBe(false);
    expect(
      moderateCommentsSchema.safeParse({
        commentIds: ["bad id with spaces"],
        action: "hide",
      }).success,
    ).toBe(false);
  });

  it("accepts comment creation payloads with text parent ids", () => {
    expect(
      createCommentSchema.parse({
        content: "Looks great",
        parentId: "comment_parent-1",
      }),
    ).toEqual({
      content: "Looks great",
      parentId: "comment_parent-1",
    });
  });
});
