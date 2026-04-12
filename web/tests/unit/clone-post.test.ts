import { afterEach, describe, expect, it, vi } from "vitest";

const SOURCE_POST = {
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
};

const mockOrderBy = vi.fn().mockResolvedValue([]);
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn(() => ({ values: mockInsertValues, onConflictDoNothing: vi.fn() }));

// Dispatch on the fields argument:
//   "title" in fields  → source post SELECT  → .from().where().limit(1)  → [SOURCE_POST]
//   "tagId" in fields  → tags SELECT          → .from().where()           → []
//   no fields          → gallery SELECT       → .from().where().orderBy() → []
const mockSelect = vi.fn((fields?: Record<string, unknown>) => {
  if (fields && "title" in fields) {
    return {
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([SOURCE_POST]),
        })),
      })),
    };
  }
  if (fields && "tagId" in fields) {
    return {
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    };
  }
  // Gallery (no fields)
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({ orderBy: mockOrderBy })),
    })),
  };
});

const mockTx = {
  query: {
    mediaAssets: { findFirst: vi.fn() },
  },
  insert: mockInsert,
};

const mockDb = {
  select: mockSelect,
  transaction: vi.fn(async (callback: (tx: typeof mockTx) => Promise<void>) => callback(mockTx)),
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/server/posts/slug", () => ({
  generateUniquePostSlug: vi.fn().mockResolvedValue("patagonia-notes-copy"),
}));

vi.mock("@/server/dal/post-column-capabilities", () => ({
  getPostColumnCapabilities: vi.fn().mockResolvedValue({
    layoutType: true,
    locationName: true,
    locationLat: true,
    locationLng: true,
    locationZoom: true,
    iovanderUrl: true,
    songTitle: true,
    songArtist: true,
    songUrl: true,
    viewCount: true,
  }),
}));

import { clonePostById } from "@/server/posts/clone";

describe("clonePostById", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("copies structured song metadata into the cloned draft", async () => {
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
