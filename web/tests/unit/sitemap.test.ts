import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/queries/posts", () => ({
  listPublishedPosts: vi.fn(),
}));

vi.mock("@/server/dal/admin-posts", () => ({
  listAdminCategories: vi.fn(),
}));

vi.mock("@/server/dal/admin-tags", () => ({
  listAllTagsWithCounts: vi.fn(),
}));

vi.mock("@/server/dal/series", () => ({
  listAllSeries: vi.fn(),
  listPublishedPostsInSeries: vi.fn(),
}));

import sitemap from "@/app/sitemap";
import { listAdminCategories } from "@/server/dal/admin-posts";
import { listAllTagsWithCounts } from "@/server/dal/admin-tags";
import { listAllSeries, listPublishedPostsInSeries } from "@/server/dal/series";
import { listPublishedPosts } from "@/server/queries/posts";
import type { BlogPost } from "@/types/blog";

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: "post-1",
    slug: "coastal-trails",
    title: "Coastal Trails",
    description: null,
    excerpt: null,
    imageUrl: null,
    category: null,
    createdAt: "2026-03-01T12:00:00.000Z",
    updatedAt: "2026-03-02T12:00:00.000Z",
    publishedAt: "2026-03-01T12:00:00.000Z",
    status: "published",
    tags: [],
    images: [],
    source: "turso",
    locationName: null,
    locationLat: null,
    locationLng: null,
    locationZoom: null,
    iovanderUrl: null,
    commentCount: 0,
    readingTimeMinutes: 3,
    ...overrides,
  };
}

function emptyTaxonomy() {
  vi.mocked(listAdminCategories).mockResolvedValue([]);
  vi.mocked(listAllTagsWithCounts).mockResolvedValue([]);
  vi.mocked(listAllSeries).mockResolvedValue([]);
}

describe("sitemap", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("includes the homepage with highest priority", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([]);
    emptyTaxonomy();

    const entries = await sitemap();

    expect(entries[0].priority).toBe(1);
    expect(entries[0].changeFrequency).toBe("daily");
  });

  it("includes static pages (map, about, wishlist, series, tags, categories)", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([]);
    emptyTaxonomy();

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.endsWith("/map"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/about"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/wishlist"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/series"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/tags"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/categories"))).toBe(true);
  });

  it("includes category, tag, and series pages when data is available", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([
      makePost({
        category: "Travel",
        tags: [{ id: "tag-1", name: "hiking", slug: "hiking" }],
      }),
    ]);
    vi.mocked(listAdminCategories).mockResolvedValue([
      { id: "cat-1", name: "Travel", slug: "travel" },
    ]);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([
      {
        id: "tag-1",
        name: "hiking",
        slug: "hiking",
        description: null,
        postCount: 3,
      },
    ]);
    vi.mocked(listAllSeries).mockResolvedValue([
      {
        id: "series-1",
        title: "Pacific Crest Trail",
        slug: "pct",
        description: null,
      },
    ]);
    vi.mocked(listPublishedPostsInSeries).mockResolvedValue([]);

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.includes("/category/travel"))).toBe(true);
    expect(urls.some((u) => u.includes("/tag/hiking"))).toBe(true);
    expect(urls.some((u) => u.includes("/series/pct"))).toBe(true);
  });

  it("paginates published posts until the feed is exhausted", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      makePost({ id: `post-${index}`, slug: `post-${index}` }),
    );
    const secondPage = [makePost({ id: "post-100", slug: "post-100" })];

    vi.mocked(listPublishedPosts)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);
    emptyTaxonomy();

    const entries = await sitemap();

    expect(vi.mocked(listPublishedPosts)).toHaveBeenNthCalledWith(1, 100, 0);
    expect(vi.mocked(listPublishedPosts)).toHaveBeenNthCalledWith(2, 100, 100);
    expect(
      entries.filter((entry) => entry.url.includes("/posts/")),
    ).toHaveLength(101);
  });

  it("uses real per-entity last-modified dates and omits them when unknown", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([
      makePost({
        category: "Travel",
        tags: [{ id: "tag-1", name: "hiking", slug: "hiking" }],
      }),
    ]);
    vi.mocked(listAdminCategories).mockResolvedValue([
      { id: "cat-1", name: "Travel", slug: "travel" },
      { id: "cat-2", name: "Gear", slug: "gear" },
    ]);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([
      {
        id: "tag-1",
        name: "hiking",
        slug: "hiking",
        description: null,
        postCount: 1,
      },
      {
        id: "tag-2",
        name: "empty",
        slug: "empty",
        description: null,
        postCount: 0,
      },
    ]);
    vi.mocked(listAllSeries).mockResolvedValue([
      { id: "series-1", title: "PCT", slug: "pct", description: null },
      { id: "series-2", title: "Empty", slug: "empty", description: null },
    ]);
    vi.mocked(listPublishedPostsInSeries).mockImplementation(
      async (seriesId) =>
        seriesId === "series-1"
          ? [
              {
                id: "post-1",
                title: "Coastal Trails",
                slug: "coastal-trails",
                excerpt: null,
                imageUrl: null,
                seriesOrder: 1,
                publishedAt: new Date("2026-02-01T12:00:00.000Z"),
                createdAt: new Date("2026-01-01T12:00:00.000Z"),
              },
            ]
          : [],
    );

    const entries = await sitemap();
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

    expect(
      byUrl.get("https://jsquaredadventures.com/posts/coastal-trails")
        ?.lastModified,
    ).toEqual(new Date("2026-03-02T12:00:00.000Z"));
    expect(
      byUrl.get("https://jsquaredadventures.com/category/travel")?.lastModified,
    ).toEqual(new Date("2026-03-02T12:00:00.000Z"));
    expect(
      byUrl.get("https://jsquaredadventures.com/tag/hiking")?.lastModified,
    ).toEqual(new Date("2026-03-02T12:00:00.000Z"));
    expect(
      byUrl.get("https://jsquaredadventures.com/series/pct")?.lastModified,
    ).toEqual(new Date("2026-02-01T12:00:00.000Z"));
    expect(
      byUrl.get("https://jsquaredadventures.com/category/gear")?.lastModified,
    ).toBeUndefined();
    expect(
      byUrl.get("https://jsquaredadventures.com/tag/empty")?.lastModified,
    ).toBeUndefined();
    expect(
      byUrl.get("https://jsquaredadventures.com/series/empty")?.lastModified,
    ).toBeUndefined();
    expect(
      byUrl.get("https://jsquaredadventures.com/about")?.lastModified,
    ).toBeUndefined();
  });

  it("falls back to base + static entries when database is unavailable", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      vi.mocked(listPublishedPosts).mockRejectedValue(new Error("db down"));
      vi.mocked(listAdminCategories).mockResolvedValue([]);
      vi.mocked(listAllTagsWithCounts).mockResolvedValue([]);
      vi.mocked(listAllSeries).mockResolvedValue([]);

      const entries = await sitemap();

      expect(entries.length).toBeGreaterThanOrEqual(4);
      expect(entries[0].url).toContain("jsquaredadventures.com");
    } finally {
      consoleError.mockRestore();
    }
  });
});
