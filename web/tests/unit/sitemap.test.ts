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
}));

import sitemap from "@/app/sitemap";
import { listAdminCategories } from "@/server/dal/admin-posts";
import { listAllTagsWithCounts } from "@/server/dal/admin-tags";
import { listAllSeries } from "@/server/dal/series";
import { listPublishedPosts } from "@/server/queries/posts";

describe("sitemap", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("includes the homepage with highest priority", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([]);
    vi.mocked(listAdminCategories).mockResolvedValue([]);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([]);
    vi.mocked(listAllSeries).mockResolvedValue([]);

    const entries = await sitemap();

    expect(entries[0].priority).toBe(1);
    expect(entries[0].changeFrequency).toBe("daily");
  });

  it("includes static pages (map, about, wishlist, tags, categories)", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([]);
    vi.mocked(listAdminCategories).mockResolvedValue([]);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([]);
    vi.mocked(listAllSeries).mockResolvedValue([]);

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.endsWith("/map"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/about"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/wishlist"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/tags"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/categories"))).toBe(true);
  });

  it("includes category, tag, and series pages when data is available", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([]);
    vi.mocked(listAdminCategories).mockResolvedValue([
      { id: "cat-1", name: "Travel", slug: "travel" },
    ]);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([
      { id: "tag-1", name: "hiking", slug: "hiking", description: null, postCount: 3 },
    ]);
    vi.mocked(listAllSeries).mockResolvedValue([
      { id: "series-1", title: "Pacific Crest Trail", slug: "pct", description: null },
    ]);

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.includes("/category/travel"))).toBe(true);
    expect(urls.some((u) => u.includes("/tag/hiking"))).toBe(true);
    expect(urls.some((u) => u.includes("/series/pct"))).toBe(true);
  });

  it("falls back to base + static entries when database is unavailable", async () => {
    vi.mocked(listPublishedPosts).mockRejectedValue(new Error("db down"));
    vi.mocked(listAdminCategories).mockResolvedValue([]);
    vi.mocked(listAllTagsWithCounts).mockResolvedValue([]);
    vi.mocked(listAllSeries).mockResolvedValue([]);

    const entries = await sitemap();

    expect(entries.length).toBeGreaterThanOrEqual(4);
    expect(entries[0].url).toContain("jsquaredadventures.com");
  });
});
