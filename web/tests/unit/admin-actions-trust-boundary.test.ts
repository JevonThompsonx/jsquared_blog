import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((location: string) => {
    throw new Error(`NEXT_REDIRECT:${location}`);
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/posts/clone", () => ({
  clonePostById: vi.fn(),
}));

vi.mock("@/server/posts/preview", () => ({
  createPostPreviewAccess: vi.fn(),
  revokePostPreviewTokens: vi.fn(),
}));

vi.mock("@/server/posts/content", () => ({
  derivePostContent: vi.fn(),
}));

vi.mock("@/server/posts/delete", () => ({
  deletePosts: vi.fn(),
}));

vi.mock("@/server/posts/publish", () => ({
  publishPosts: vi.fn(),
  unpublishPosts: vi.fn(),
}));

import { revalidatePath } from "next/cache";

import type { AdminSession } from "@/lib/auth/session";
import { requireAdminSession } from "@/lib/auth/session";
import {
  bulkDeletePosts,
  bulkPublishPosts,
  bulkUnpublishPosts,
  clonePost,
  createPostPreviewLinkAction,
  deletePostAction,
  validatePostContentWarningsAction,
} from "@/app/admin/actions";
import { clonePostById } from "@/server/posts/clone";
import { derivePostContent } from "@/server/posts/content";
import { deletePosts } from "@/server/posts/delete";
import { createPostPreviewAccess } from "@/server/posts/preview";
import { publishPosts, unpublishPosts } from "@/server/posts/publish";

const ADMIN_SESSION: AdminSession = {
  user: { id: "admin-1", role: "admin" },
  expires: "2099-01-01T00:00:00.000Z",
};

const NON_ADMIN_SESSION: AdminSession = {
  user: { id: "author-1", role: "author" },
  expires: "2099-01-01T00:00:00.000Z",
};

describe("admin action trust boundaries", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid preview requests with a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(createPostPreviewLinkAction("")).rejects.toThrow("Invalid request");
    await expect(createPostPreviewLinkAction("   ")).rejects.toThrow("Invalid request");

    expect(vi.mocked(createPostPreviewAccess)).not.toHaveBeenCalled();
  });

  it("redirects non-admin sessions before preview creation", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(createPostPreviewLinkAction("post-1")).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(createPostPreviewAccess)).not.toHaveBeenCalled();
  });

  it("rejects invalid clone requests with a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(clonePost("")).rejects.toThrow("Invalid request");
    await expect(clonePost("   ")).rejects.toThrow("Invalid request");

    expect(vi.mocked(clonePostById)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("redirects non-admin sessions before clone requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(clonePost("post-1")).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(clonePostById)).not.toHaveBeenCalled();
    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("rejects invalid delete requests with a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(deletePostAction("")).rejects.toThrow("Invalid request");
    await expect(deletePostAction("   ")).rejects.toThrow("Invalid request");

    expect(vi.mocked(deletePosts)).not.toHaveBeenCalled();
  });

  it("redirects non-admin sessions before delete requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(deletePostAction("post-1")).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(deletePosts)).not.toHaveBeenCalled();
  });

  it("rejects invalid bulk publish requests with a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(bulkPublishPosts([""])).rejects.toThrow("Invalid request");
    await expect(bulkPublishPosts(["   "])).rejects.toThrow("Invalid request");

    expect(vi.mocked(publishPosts)).not.toHaveBeenCalled();
  });

  it("redirects non-admin sessions before bulk publish requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(bulkPublishPosts(["post-1"])).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(publishPosts)).not.toHaveBeenCalled();
  });

  it("rejects invalid bulk unpublish requests with a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(bulkUnpublishPosts([""])).rejects.toThrow("Invalid request");
    await expect(bulkUnpublishPosts(["   "])).rejects.toThrow("Invalid request");

    expect(vi.mocked(unpublishPosts)).not.toHaveBeenCalled();
  });

  it("redirects non-admin sessions before bulk unpublish requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(bulkUnpublishPosts(["post-1"])).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(unpublishPosts)).not.toHaveBeenCalled();
  });

  it("rejects invalid bulk delete requests with a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

    await expect(bulkDeletePosts([""])).rejects.toThrow("Invalid request");
    await expect(bulkDeletePosts(["   "])).rejects.toThrow("Invalid request");

    expect(vi.mocked(deletePosts)).not.toHaveBeenCalled();
  });

  it("redirects non-admin sessions before bulk delete requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(bulkDeletePosts(["post-1"])).rejects.toThrow("NEXT_REDIRECT:/admin?error=AccessDenied");

    expect(vi.mocked(deletePosts)).not.toHaveBeenCalled();
  });

  it("creates preview links for valid requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createPostPreviewAccess).mockResolvedValue({
      postId: "post-1",
      previewPath: "/preview/post-1?token=abc",
      token: "abc",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });

    const result = await createPostPreviewLinkAction("post-1");

    expect(result).toEqual({
      postId: "post-1",
      previewPath: "/preview/post-1?token=abc",
      token: "abc",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(vi.mocked(createPostPreviewAccess)).toHaveBeenCalledWith("post-1", "admin-1");
  });

  it("converts preview post-not-found failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createPostPreviewAccess).mockRejectedValue(new Error("Post post-1 not found in drafts table"));

    await expect(createPostPreviewLinkAction("post-1")).rejects.toThrow("Post not found");
  });

  it("converts unexpected preview creation failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(createPostPreviewAccess).mockRejectedValue(
      new Error('insert into "post_preview_tokens" failed: duplicate key value violates unique constraint'),
    );

    await expect(createPostPreviewLinkAction("post-1")).rejects.toThrow("Failed to create preview");
  });

  it("rejects malformed post warning content with a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(derivePostContent).mockImplementation(() => {
      throw new SyntaxError("Unexpected end of JSON input");
    });

    await expect(validatePostContentWarningsAction("{", null)).rejects.toThrow("Invalid post content");
    expect(vi.mocked(derivePostContent)).toHaveBeenCalledWith("{", null);
  });

  it("redirects non-admin sessions before validating post warnings", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(NON_ADMIN_SESSION);

    await expect(validatePostContentWarningsAction('{"type":"doc"}', null)).rejects.toThrow(
      "NEXT_REDIRECT:/admin?error=AccessDenied",
    );

    expect(vi.mocked(derivePostContent)).not.toHaveBeenCalled();
  });

  it("rejects structurally invalid post warning content with a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(derivePostContent).mockImplementation(() => {
      throw new Error("Content must be valid Tiptap JSON");
    });

    await expect(validatePostContentWarningsAction('{"type":"doc"}', null)).rejects.toThrow("Invalid post content");
    expect(vi.mocked(derivePostContent)).toHaveBeenCalledWith('{"type":"doc"}', null);
  });

  it("converts unexpected post warning derivation failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(derivePostContent).mockImplementation(() => {
      throw new Error("Renderer exploded");
    });

    await expect(validatePostContentWarningsAction('{"type":"doc"}', null)).rejects.toThrow("Failed to validate post content");
    expect(vi.mocked(derivePostContent)).toHaveBeenCalledWith('{"type":"doc"}', null);
  });

  it("clones posts for valid requests and revalidates admin", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(clonePostById).mockResolvedValue({
      postId: "post-2",
      slug: "cloned-post",
      title: "Cloned Post",
      status: "draft",
    });

    const result = await clonePost("post-1");

    expect(result).toEqual({
      postId: "post-2",
      slug: "cloned-post",
      title: "Cloned Post",
      status: "draft",
    });
    expect(vi.mocked(clonePostById)).toHaveBeenCalledWith("post-1");
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith("/admin");
  });

  it("converts clone source-post not-found failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(clonePostById).mockRejectedValue(new Error("Post post-1 not found in source table"));

    await expect(clonePost("post-1")).rejects.toThrow("Post not found");

    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("converts clone dependency not-found failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(clonePostById).mockRejectedValue(new Error("Media asset media-9 not found"));

    await expect(clonePost("post-1")).rejects.toThrow("Failed to clone post");

    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("converts unexpected clone failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(clonePostById).mockRejectedValue(
      new Error('duplicate key value violates unique constraint "posts_slug_key"'),
    );

    await expect(clonePost("post-1")).rejects.toThrow("Failed to clone post");

    expect(vi.mocked(revalidatePath)).not.toHaveBeenCalled();
  });

  it("still returns the cloned post when admin revalidation fails after a successful clone", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(clonePostById).mockResolvedValue({
      postId: "post-2",
      slug: "cloned-post",
      title: "Cloned Post",
      status: "draft",
    });
    vi.mocked(revalidatePath).mockImplementation(() => {
      throw new Error("cache unavailable");
    });

    const result = await clonePost("post-1");

    expect(result).toEqual({
      postId: "post-2",
      slug: "cloned-post",
      title: "Cloned Post",
      status: "draft",
    });
  });

  it("publishes valid bulk requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(publishPosts).mockResolvedValue({
      operation: "publish",
      requestedCount: 2,
      updated: 2,
      updatedCount: 2,
      unchangedCount: 0,
      missingIds: [],
      updatedPostIds: ["post-1", "post-2"],
      unchangedPostIds: [],
    });

    const result = await bulkPublishPosts(["post-1", "post-2"]);

    expect(result).toEqual({
      operation: "publish",
      requestedCount: 2,
      updated: 2,
      updatedCount: 2,
      unchangedCount: 0,
      missingIds: [],
      updatedPostIds: ["post-1", "post-2"],
      unchangedPostIds: [],
    });
    expect(vi.mocked(publishPosts)).toHaveBeenCalledWith(["post-1", "post-2"]);
  });

  it("converts unexpected bulk publish failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(publishPosts).mockRejectedValue(new Error('update failed: duplicate key value violates unique constraint'));

    await expect(bulkPublishPosts(["post-1", "post-2"])).rejects.toThrow("Failed to publish posts");
  });

  it("unpublishes valid bulk requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(unpublishPosts).mockResolvedValue({
      operation: "unpublish",
      requestedCount: 1,
      updated: 1,
      updatedCount: 1,
      unchangedCount: 0,
      missingIds: [],
      updatedPostIds: ["post-1"],
      unchangedPostIds: [],
    });

    const result = await bulkUnpublishPosts(["post-1"]);

    expect(result).toEqual({
      operation: "unpublish",
      requestedCount: 1,
      updated: 1,
      updatedCount: 1,
      unchangedCount: 0,
      missingIds: [],
      updatedPostIds: ["post-1"],
      unchangedPostIds: [],
    });
    expect(vi.mocked(unpublishPosts)).toHaveBeenCalledWith(["post-1"]);
  });

  it("converts unexpected bulk unpublish failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(unpublishPosts).mockRejectedValue(new Error('update failed: row lock timeout exceeded'));

    await expect(bulkUnpublishPosts(["post-1"])).rejects.toThrow("Failed to unpublish posts");
  });

  it("deletes a valid single post request", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deletePosts).mockResolvedValue({
      requestedCount: 1,
      deletedCount: 1,
      missingIds: [],
      deletedPostIds: ["post-1"],
    });

    const result = await deletePostAction("post-1");

    expect(result).toEqual({
      requestedCount: 1,
      deletedCount: 1,
      missingIds: [],
      deletedPostIds: ["post-1"],
    });
    expect(vi.mocked(deletePosts)).toHaveBeenCalledWith(["post-1"]);
  });

  it("converts unexpected single-delete failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deletePosts).mockRejectedValue(new Error('delete failed: foreign key constraint violation'));

    await expect(deletePostAction("post-1")).rejects.toThrow("Failed to delete post");
  });

  it("deletes valid bulk requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deletePosts).mockResolvedValue({
      requestedCount: 2,
      deletedCount: 2,
      missingIds: [],
      deletedPostIds: ["post-1", "post-2"],
    });

    const result = await bulkDeletePosts(["post-1", "post-2"]);

    expect(result).toEqual({
      requestedCount: 2,
      deletedCount: 2,
      missingIds: [],
      deletedPostIds: ["post-1", "post-2"],
    });
    expect(vi.mocked(deletePosts)).toHaveBeenCalledWith(["post-1", "post-2"]);
  });

  it("converts unexpected bulk delete failures into a stable safe error", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(deletePosts).mockRejectedValue(new Error('delete failed: transaction aborted'));

    await expect(bulkDeletePosts(["post-1", "post-2"])).rejects.toThrow("Failed to delete posts");
  });
});
