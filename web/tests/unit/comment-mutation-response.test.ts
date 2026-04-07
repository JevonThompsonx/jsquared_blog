import { describe, expect, it } from "vitest";

import { resolveCommentMutationComments } from "@/lib/comment-mutation-response";

describe("resolveCommentMutationComments", () => {
  it("returns refreshed comments when present", () => {
    const currentComments = [{ id: "comment-1" }];
    const nextComments = [{ id: "comment-2" }];

    expect(resolveCommentMutationComments(currentComments, nextComments)).toEqual({
      comments: nextComments,
      shouldRefetch: false,
    });
  });

  it("preserves existing comments and requests a refetch when the response omits them", () => {
    const currentComments = [{ id: "comment-1" }];

    expect(resolveCommentMutationComments(currentComments)).toEqual({
      comments: currentComments,
      shouldRefetch: true,
    });
  });
});
