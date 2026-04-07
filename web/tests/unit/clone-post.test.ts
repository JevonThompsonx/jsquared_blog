import { afterEach, describe, expect, it, vi } from "vitest";

const mockFindFirst = vi.fn();
const mockOrderBy = vi.fn().mockResolvedValue([]);
const mockWhere = vi.fn();
const mockFrom = vi.fn((table?: { sortOrder?: unknown }) => {
  if (table && typeof table === "object" && "sortOrder" in table) {
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
  } else {
    mockWhere.mockResolvedValue([]);
  }

  return { where: mockWhere };
});
const mockSelect = vi.fn(() => ({ from: mockFrom }));
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn(() => ({ values: mockInsertValues, onConflictDoNothing: vi.fn() }));

const mockTx = {
  query: {
    mediaAssets: { findFirst: vi.fn() },
  },
  insert: mockInsert,
};

const mockDb = {
  query: {
    posts: { findFirst: mockFindFirst },
  },
  select: mockSelect,
  transaction: vi.fn(async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx)),
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/server/posts/slug", () => ({
  generateUniquePostSlug: vi.fn().mockResolvedValue("patagonia-notes-copy"),
}));

import { clonePostById } from "@/server/posts/clone";

describe("clonePostById", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("copies structured song metadata into the cloned draft", async () => {
    mockFindFirst.mockResolvedValue({
      id: "post-1",
      slug: "patagonia-notes",
      title: "Patagonia Notes",
      contentJson: '{"type":"doc","content":[]}',
      contentFormat: "tiptap-json",
      contentHtml: "<p>Hi</p>",
      contentPlainText: "Hi",
      excerpt: "Excerpt",
      layoutType: "standard",
      featuredImageId: null,
      authorId: "author-1",
      categoryId: null,
      seriesId: null,
      seriesOrder: null,
      externalGalleryUrl: null,
      externalGalleryLabel: null,
      locationName: null,
      locationLat: null,
      locationLng: null,
      locationZoom: null,
      iovanderUrl: null,
      songTitle: "Holocene",
      songArtist: "Bon Iver",
      songUrl: "https://open.spotify.com/track/123",
    });

    const result = await clonePostById("post-1");

    expect(result).toMatchObject({
      slug: "patagonia-notes-copy",
      status: "draft",
    });
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        songTitle: "Holocene",
        songArtist: "Bon Iver",
        songUrl: "https://open.spotify.com/track/123",
        status: "draft",
        publishedAt: null,
        scheduledPublishTime: null,
      }),
    );
  });
});
