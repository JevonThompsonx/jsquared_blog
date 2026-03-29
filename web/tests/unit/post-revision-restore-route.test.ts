import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, limit: 10, remaining: 9, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/dal/post-revisions", () => ({
  applyRevisionContentToPost: vi.fn(),
  createPostRevision: vi.fn(),
  getPostContentSnapshot: vi.fn(),
  getPostRevisionById: vi.fn(),
}));

vi.mock("@/server/posts/content", () => ({
  derivePostContent: vi.fn(),
}));

import { POST } from "@/app/api/admin/posts/[postId]/revisions/[revisionId]/restore/route";
import { requireAdminSession } from "@/lib/auth/session";
import {
  applyRevisionContentToPost,
  createPostRevision,
  getPostContentSnapshot,
  getPostRevisionById,
} from "@/server/dal/post-revisions";
import { derivePostContent } from "@/server/posts/content";

const MOCK_ADMIN_SESSION = {
  user: { id: "admin-1", email: "admin@example.com", name: "Admin" },
  expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

const MOCK_REVISION = {
  id: "rev-3",
  postId: "post-1",
  revisionNum: 3,
  title: "Historical Title",
  contentJson: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"old content"}]}]}',
  excerpt: "old excerpt",
  savedByUserId: "admin-1",
  savedAt: new Date("2026-03-15T10:00:00Z"),
  label: null,
};

const MOCK_CURRENT_SNAPSHOT = {
  title: "Current Title",
  slug: "current-title",
  contentJson: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"current content"}]}]}',
  excerpt: "current excerpt",
};

const MOCK_DERIVED = {
  canonicalContentJson: MOCK_REVISION.contentJson,
  contentFormat: "tiptap-json" as const,
  contentHtml: "<p>old content</p>",
  contentPlainText: "old content",
  excerpt: "old excerpt",
  imageAltWarnings: [],
};

const MOCK_PRE_RESTORE_REVISION = {
  id: "rev-pre-restore",
  postId: "post-1",
  revisionNum: 4,
  title: MOCK_CURRENT_SNAPSHOT.title,
  contentJson: MOCK_CURRENT_SNAPSHOT.contentJson,
  excerpt: MOCK_CURRENT_SNAPSHOT.excerpt,
  savedByUserId: "admin-1",
  savedAt: new Date(),
  label: "Before restore to revision 3",
};

function makeRequest(postId = "post-1", revisionId = "rev-3"): [Request, { params: Promise<{ postId: string; revisionId: string }> }] {
  return [
    new Request(`http://localhost/api/admin/posts/${postId}/revisions/${revisionId}/restore`, {
      method: "POST",
    }),
    { params: Promise.resolve({ postId, revisionId }) },
  ];
}

describe("POST /api/admin/posts/[postId]/revisions/[revisionId]/restore", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const [req, ctx] = makeRequest();
    const response = await POST(req, ctx);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for an empty postId", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);

    const [req, ctx] = makeRequest("", "rev-3");
    const response = await POST(req, ctx);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid params" });
  });

  it("returns 400 for an empty revisionId", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);

    const [req, ctx] = makeRequest("post-1", "");
    const response = await POST(req, ctx);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid params" });
  });

  it("returns 404 when the revision does not exist or belongs to a different post", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(null);

    const [req, ctx] = makeRequest("post-1", "rev-missing");
    const response = await POST(req, ctx);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Revision not found" });
  });

  it("returns 404 when the post does not exist", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(MOCK_REVISION);
    vi.mocked(getPostContentSnapshot).mockResolvedValue(null);

    const [req, ctx] = makeRequest("post-1", "rev-3");
    const response = await POST(req, ctx);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Post not found" });
  });

  it("returns 422 when the revision contentJson is invalid Tiptap", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(MOCK_REVISION);
    vi.mocked(getPostContentSnapshot).mockResolvedValue(MOCK_CURRENT_SNAPSHOT);
    vi.mocked(derivePostContent).mockImplementation(() => {
      throw new Error("Content must be valid Tiptap JSON");
    });

    const [req, ctx] = makeRequest();
    const response = await POST(req, ctx);

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error).toContain("not valid Tiptap JSON");
  });

  it("creates a pre-restore revision of the current state, then applies the historical revision", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(MOCK_REVISION);
    vi.mocked(getPostContentSnapshot).mockResolvedValue(MOCK_CURRENT_SNAPSHOT);
    vi.mocked(derivePostContent).mockReturnValue(MOCK_DERIVED);
    vi.mocked(createPostRevision).mockResolvedValue(MOCK_PRE_RESTORE_REVISION);
    vi.mocked(applyRevisionContentToPost).mockResolvedValue(undefined);

    const [req, ctx] = makeRequest();
    const response = await POST(req, ctx);

    expect(response.status).toBe(200);

    // Should snapshot the CURRENT state before overwriting
    expect(vi.mocked(createPostRevision)).toHaveBeenCalledOnce();
    expect(vi.mocked(createPostRevision)).toHaveBeenCalledWith({
      postId: "post-1",
      title: MOCK_CURRENT_SNAPSHOT.title,
      contentJson: MOCK_CURRENT_SNAPSHOT.contentJson,
      excerpt: MOCK_CURRENT_SNAPSHOT.excerpt,
      savedByUserId: "admin-1",
      label: "Before restore to revision 3",
    });

    // Should derive content from the REVISION's contentJson
    expect(vi.mocked(derivePostContent)).toHaveBeenCalledWith(
      MOCK_REVISION.contentJson,
      MOCK_REVISION.excerpt,
    );

    // Should apply the derived content to the post
    expect(vi.mocked(applyRevisionContentToPost)).toHaveBeenCalledOnce();
    expect(vi.mocked(applyRevisionContentToPost)).toHaveBeenCalledWith(
      "post-1",
      expect.objectContaining({
        title: MOCK_REVISION.title,
        contentJson: MOCK_DERIVED.canonicalContentJson,
        contentHtml: MOCK_DERIVED.contentHtml,
        contentPlainText: MOCK_DERIVED.contentPlainText,
        excerpt: MOCK_DERIVED.excerpt,
      }),
    );
  });

  it("returns the correct response body on success", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(MOCK_REVISION);
    vi.mocked(getPostContentSnapshot).mockResolvedValue(MOCK_CURRENT_SNAPSHOT);
    vi.mocked(derivePostContent).mockReturnValue(MOCK_DERIVED);
    vi.mocked(createPostRevision).mockResolvedValue(MOCK_PRE_RESTORE_REVISION);
    vi.mocked(applyRevisionContentToPost).mockResolvedValue(undefined);

    const [req, ctx] = makeRequest();
    const response = await POST(req, ctx);

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body).toEqual({
      postId: "post-1",
      restoredRevisionId: "rev-3",
      newRevisionId: MOCK_PRE_RESTORE_REVISION.id,
    });
  });

  it("does not apply content if the pre-restore revision creation fails", async () => {
    // If createPostRevision throws, the restore must abort — we do not want a
    // partial state where the post is overwritten but no undo-point revision exists.
    vi.mocked(requireAdminSession).mockResolvedValue(MOCK_ADMIN_SESSION);
    vi.mocked(getPostRevisionById).mockResolvedValue(MOCK_REVISION);
    vi.mocked(getPostContentSnapshot).mockResolvedValue(MOCK_CURRENT_SNAPSHOT);
    vi.mocked(derivePostContent).mockReturnValue(MOCK_DERIVED);
    vi.mocked(createPostRevision).mockRejectedValue(new Error("DB write failed"));

    const [req, ctx] = makeRequest();

    await expect(POST(req, ctx)).rejects.toThrow("DB write failed");
    expect(vi.mocked(applyRevisionContentToPost)).not.toHaveBeenCalled();
  });
});
