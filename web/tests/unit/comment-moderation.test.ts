import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  applyCommentModerationAction,
  getPublicCommentContent,
} from "@/server/dal/comments";
import type { CommentModerationAction, CommentVisibility } from "@/server/forms/comments";

function apply(
  action: CommentModerationAction,
  visibility: CommentVisibility,
  isFlagged: boolean,
) {
  return applyCommentModerationAction(action, { visibility, isFlagged });
}

describe("comment moderation helpers", () => {
  it("hides a visible comment and clears its flag", () => {
    expect(apply("hide", "visible", true)).toEqual({
      changed: true,
      visibility: "hidden",
      isFlagged: false,
    });
  });

  it("unhides a hidden comment", () => {
    expect(apply("unhide", "hidden", false)).toEqual({
      changed: true,
      visibility: "visible",
      isFlagged: false,
    });
  });

  it("flags a comment without changing visibility", () => {
    expect(apply("flag", "visible", false)).toEqual({
      changed: true,
      visibility: "visible",
      isFlagged: true,
    });
  });

  it("deletes a comment and removes the flag", () => {
    expect(apply("delete", "hidden", true)).toEqual({
      changed: true,
      visibility: "deleted",
      isFlagged: false,
    });
  });

  it("returns unchanged when the moderation action is already applied", () => {
    expect(apply("unflag", "visible", false)).toEqual({
      changed: false,
      visibility: "visible",
      isFlagged: false,
    });
  });
});

describe("public comment placeholders", () => {
  it("replaces hidden comments with a moderator placeholder", () => {
    expect(getPublicCommentContent("Original text", "hidden")).toBe("This comment is hidden by an admin.");
  });

  it("replaces deleted comments with a deleted placeholder", () => {
    expect(getPublicCommentContent("Original text", "deleted")).toBe("This comment has been deleted.");
  });

  it("passes through visible comments unchanged", () => {
    expect(getPublicCommentContent("Original text", "visible")).toBe("Original text");
  });
});
