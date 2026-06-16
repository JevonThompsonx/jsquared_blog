import { afterEach, describe, expect, it, vi } from "vitest";

const { unstableCacheMock, revalidateTagMock, listPublishedPostRecordsMock, listAllPublishedPostRecordsMock, listTagsByPostIdsMock, listCommentCountsByPostIdsMock } = vi.hoisted(() => ({
  unstableCacheMock: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
  revalidateTagMock: vi.fn(),
  listPublishedPostRecordsMock: vi.fn(),
  listAllPublishedPostRecordsMock: vi.fn(),
  listTagsByPostIdsMock: vi.fn(() => Promise.resolve([])),
  listCommentCountsByPostIdsMock: vi.fn(() => Promise.resolve(new Map())),
}));

vi.mock("next/cache", () => ({
  unstable_cache: unstableCacheMock,
  revalidateTag: revalidateTagMock,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/content", () => ({
  getReadingTimeMinutes: vi.fn(() => 1),
  renderTiptapJson: vi.fn(() => null),
}));

vi.mock("@/lib/cloudinary/transform", () => ({
  cdnImageUrl: vi.fn((value: string | null) => value),
}));

vi.mock("@/lib/post-song-metadata", () => ({
  getSongMetadata: vi.fn(() => null),
}));

vi.mock("@/lib/related-posts", () => ({
  rankRelatedPosts: vi.fn((_post: unknown, candidates: unknown[]) => candidates),
}));

vi.mock("@/server/dal/posts", () => ({
  listPublishedPostRecords: listPublishedPostRecordsMock,
  listAllPublishedPostRecords: listAllPublishedPostRecordsMock,
  listTagsByPostIds: listTagsByPostIdsMock,
  listCommentCountsByPostIds: listCommentCountsByPostIdsMock,
  getAnyPostRecordById: vi.fn(),
  getPublishedPostRecordBySlug: vi.fn(),
  listImagesForPost: vi.fn(),
  listPublishedPostRecordsByCategory: vi.fn(),
  listPublishedPostRecordsByTagSlug: vi.fn(),
  listPublishedPostRecordsByTagSlugs: vi.fn(),
  listRecentPublishedPostRecords: vi.fn(),
  listTagsForPost: vi.fn(),
}));

vi.mock("@/server/dal/post-links", () => ({
  listLinksForPost: vi.fn(),
}));

import { listPublishedPosts } from "@/server/queries/posts";

const sampleRecord = {
  id: "post-1",
  slug: "patagonia",
  title: "Patagonia",
  contentFormat: "html",
  contentHtml: "<p>Hello</p>",
  contentJson: null,
  excerpt: "Excerpt",
  imageUrl: null,
  category: null,
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  status: "published",
  layoutType: "standard",
  viewCount: 0,
  locationName: null,
  locationLat: null,
  locationLng: null,
  locationZoom: null,
  iovanderUrl: null,
  songTitle: null,
  songArtist: null,
  songUrl: null,
  authorId: "admin-1",
};

describe("listPublishedPosts caching", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("wraps listPublishedPosts with unstable_cache tagged 'posts' and a 30-60s TTL", async () => {
    listPublishedPostRecordsMock.mockResolvedValue([sampleRecord]);

    await listPublishedPosts(12, 0);

    expect(unstableCacheMock).toHaveBeenCalledTimes(1);
    const call = unstableCacheMock.mock.calls[0] as unknown as [
      (...args: unknown[]) => unknown,
      string[] | undefined,
      { revalidate?: number; tags?: string[] } | undefined,
    ];
    const [, keyParts, options] = call;
    expect(keyParts).toEqual(["listPublishedPosts"]);
    expect(options).toEqual(
      expect.objectContaining({
        tags: ["posts"],
        revalidate: expect.any(Number),
      }),
    );
    const ttl = options?.revalidate;
    expect(typeof ttl).toBe("number");
    expect(ttl).toBeGreaterThanOrEqual(30);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it("returns posts through the cache wrapper", async () => {
    listPublishedPostRecordsMock.mockResolvedValue([sampleRecord]);

    const posts = await listPublishedPosts(12, 0);

    expect(posts).toHaveLength(1);
    expect(posts[0]?.slug).toBe("patagonia");
  });
});
