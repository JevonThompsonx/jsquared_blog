/**
 * Tests for the revision-capture side-effect in updateAdminPostAction.
 *
 * The action calls redirect() from next/navigation after saving, which throws
 * a special Next.js error.  We mock redirect to a no-op so the test can assert
 * on what happened before it would normally throw.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

// ── Next.js internals ──────────────────────────────────────────────────────────
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// ── Auth ───────────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

// ── DB / Drizzle ───────────────────────────────────────────────────────────────
const mockFindFirst = vi.fn();
const mockInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
const mockUpdate = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) }));
const mockDelete = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));

// select().from().where() chain — must return an iterable array for replacePostMediaTx
const mockSelectWhere = vi.fn().mockResolvedValue([]);
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelectChain = vi.fn(() => ({ from: mockSelectFrom }));

// Also used for countPostRevisions pattern (select({ count }).from().where())
// The chain builder is re-used; override per test if needed.

const mockTx = {
  query: {
    posts: { findFirst: mockFindFirst },
    categories: { findFirst: vi.fn().mockResolvedValue(null) },
    tags: { findFirst: vi.fn().mockResolvedValue(null) },
  },
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  select: mockSelectChain,
};

const mockDb = {
  query: { posts: { findFirst: mockFindFirst } },
  transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<void>) => cb(mockTx)),
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  select: mockSelectChain,
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

// ── DAL / services ─────────────────────────────────────────────────────────────
vi.mock("@/server/dal/post-revisions", () => ({
  createPostRevision: vi.fn(),
}));

vi.mock("@/server/dal/series", () => ({
  ensureSeriesId: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/posts/preview", () => ({
  revokePostPreviewTokens: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/posts/slug", () => ({
  generateUniquePostSlug: vi.fn().mockResolvedValue("my-post-slug"),
}));

vi.mock("@/server/posts/content", () => ({
  derivePostContent: vi.fn().mockReturnValue({
    canonicalContentJson: '{"type":"doc","content":[]}',
    contentFormat: "tiptap-json",
    contentHtml: "<p>hello</p>",
    contentPlainText: "hello",
    excerpt: "hello excerpt",
    imageAltWarnings: [],
  }),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────────
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/session";
import { createPostRevision } from "@/server/dal/post-revisions";
import { createAdminPostAction, updateAdminPostAction } from "@/app/admin/actions";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_SESSION = {
  user: { id: "admin-1", email: "a@example.com", name: "Admin" },
  expires: new Date(Date.now() + 3_600_000).toISOString(),
};

const EXISTING_POST = {
  publishedAt: null,
  title: "Original Title",
  contentJson: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"old content"}]}]}',
  excerpt: "old excerpt",
};

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("title", overrides.title ?? "New Title");
  fd.set("slug", overrides.slug ?? "new-title");
  fd.set("excerpt", overrides.excerpt ?? "new excerpt");
  fd.set("categoryName", overrides.categoryName ?? "");
  fd.set("tagNames", overrides.tagNames ?? "");
  fd.set("status", overrides.status ?? "draft");
  fd.set("layoutType", overrides.layoutType ?? "standard");
  fd.set("scheduledPublishTime", overrides.scheduledPublishTime ?? "");
  fd.set("scheduledPublishOffsetMinutes", overrides.scheduledPublishOffsetMinutes ?? "0");
  fd.set("featuredImageUrl", overrides.featuredImageUrl ?? "");
  fd.set("featuredImageAlt", overrides.featuredImageAlt ?? "");
  fd.set("galleryEntries", overrides.galleryEntries ?? "[]");
  fd.set("contentJson", overrides.contentJson ?? '{"type":"doc","content":[]}');
  fd.set("seriesTitle", overrides.seriesTitle ?? "");
  fd.set("seriesOrder", overrides.seriesOrder ?? "");
  fd.set("locationName", overrides.locationName ?? "");
  fd.set("iovanderUrl", overrides.iovanderUrl ?? "");
  return fd;
}

describe("updateAdminPostAction — revision capture", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls createPostRevision with the pre-update content after a successful save", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(redirect).mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    mockFindFirst.mockResolvedValue(EXISTING_POST);
    vi.mocked(createPostRevision).mockResolvedValue({
      id: "rev-1",
      postId: "post-1",
      revisionNum: 1,
      title: EXISTING_POST.title,
      contentJson: EXISTING_POST.contentJson,
      excerpt: EXISTING_POST.excerpt,
      savedByUserId: "admin-1",
      savedAt: new Date(),
      label: null,
    });

    // The action ends with redirect(), which we throw; catch it so the test doesn't fail
    await expect(updateAdminPostAction("post-1", buildFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(createPostRevision)).toHaveBeenCalledOnce();
    expect(vi.mocked(createPostRevision)).toHaveBeenCalledWith({
      postId: "post-1",
      title: EXISTING_POST.title,
      contentJson: EXISTING_POST.contentJson,
      excerpt: EXISTING_POST.excerpt,
      savedByUserId: "admin-1",
    });
  });

  it("does not call createPostRevision when the post does not exist", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(redirect).mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    mockFindFirst.mockResolvedValue(undefined);

    await expect(updateAdminPostAction("ghost-post", buildFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(createPostRevision)).not.toHaveBeenCalled();
  });

  it("still redirects (save succeeds) when createPostRevision throws", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(redirect).mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    mockFindFirst.mockResolvedValue(EXISTING_POST);
    vi.mocked(createPostRevision).mockRejectedValue(new Error("DB connection error"));

    // The save must complete and redirect even though the revision write failed
    await expect(updateAdminPostAction("post-1", buildFormData())).rejects.toThrow("NEXT_REDIRECT");

    // createPostRevision was attempted but failed non-fatally
    expect(vi.mocked(createPostRevision)).toHaveBeenCalledOnce();
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/admin/posts/post-1/edit?saved=1");
  });

  it("passes excerpt as null when the existing post has no excerpt", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
    vi.mocked(redirect).mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
    mockFindFirst.mockResolvedValue({ ...EXISTING_POST, excerpt: null });
    vi.mocked(createPostRevision).mockResolvedValue({
      id: "rev-1",
      postId: "post-1",
      revisionNum: 1,
      title: EXISTING_POST.title,
      contentJson: EXISTING_POST.contentJson,
      excerpt: null,
      savedByUserId: "admin-1",
      savedAt: new Date(),
      label: null,
    });

    await expect(updateAdminPostAction("post-1", buildFormData())).rejects.toThrow("NEXT_REDIRECT");

    expect(vi.mocked(createPostRevision)).toHaveBeenCalledWith(
      expect.objectContaining({ excerpt: null }),
    );
  });

  it.each(["{not-json}", "{}"]) (
    "aborts before starting the transaction when update gallery entries are invalid: %s",
    async (galleryEntries) => {
      vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);
      mockFindFirst.mockResolvedValue(EXISTING_POST);

      await expect(
        updateAdminPostAction("post-1", buildFormData({ galleryEntries })),
      ).rejects.toThrow();

      expect(mockDb.transaction).not.toHaveBeenCalled();
      expect(vi.mocked(createPostRevision)).not.toHaveBeenCalled();
      expect(vi.mocked(redirect)).not.toHaveBeenCalled();
    },
  );

  it.each(["{not-json}", "{}"]) (
    "aborts before starting the transaction when create gallery entries are invalid: %s",
    async (galleryEntries) => {
      vi.mocked(requireAdminSession).mockResolvedValue(ADMIN_SESSION);

      await expect(createAdminPostAction(buildFormData({ galleryEntries }))).rejects.toThrow();

      expect(mockDb.transaction).not.toHaveBeenCalled();
      expect(vi.mocked(createPostRevision)).not.toHaveBeenCalled();
      expect(vi.mocked(redirect)).not.toHaveBeenCalled();
    },
  );
});
