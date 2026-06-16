import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/dal/categories", () => ({
  getCategoryNameBySlug: vi.fn(),
}));

vi.mock("@/server/queries/posts", () => ({
  listPublishedPostsByCategory: vi.fn(),
}));

vi.mock("@/server/feeds/rss", () => ({
  buildRssXml: vi.fn(() => "<rss />"),
  createRssResponse: vi.fn((xml: string) => new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  })),
}));

import { GET } from "@/app/(blog)/category/[category]/feed.xml/route";
import { getCategoryNameBySlug } from "@/server/dal/categories";
import { buildRssXml, createRssResponse } from "@/server/feeds/rss";
import { listPublishedPostsByCategory } from "@/server/queries/posts";

describe("GET /category/[category]/feed.xml", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for malformed percent-encoded category params before querying posts", async () => {
    const response = await GET(new Request("http://localhost/category/%E0%A4%A/feed.xml"), {
      params: Promise.resolve({ category: "%E0%A4%A" }),
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid category");
    expect(vi.mocked(getCategoryNameBySlug)).not.toHaveBeenCalled();
    expect(vi.mocked(listPublishedPostsByCategory)).not.toHaveBeenCalled();
    expect(vi.mocked(buildRssXml)).not.toHaveBeenCalled();
    expect(vi.mocked(createRssResponse)).not.toHaveBeenCalled();
  });

  it("returns 400 for percent-encoded whitespace-only category params", async () => {
    const response = await GET(new Request("http://localhost/category/%20%20/feed.xml"), {
      params: Promise.resolve({ category: "%20%20" }),
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid category");
    expect(vi.mocked(getCategoryNameBySlug)).not.toHaveBeenCalled();
    expect(vi.mocked(listPublishedPostsByCategory)).not.toHaveBeenCalled();
  });

  it("trims and decodes valid category params before building the feed", async () => {
    vi.mocked(getCategoryNameBySlug).mockResolvedValue("Van Life");
    vi.mocked(listPublishedPostsByCategory).mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/category/van-life/feed.xml"), {
      params: Promise.resolve({ category: "  van-life  " }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(getCategoryNameBySlug)).toHaveBeenCalledWith("van-life");
    expect(vi.mocked(listPublishedPostsByCategory)).toHaveBeenCalledWith("van-life", 100, 0);
    expect(vi.mocked(buildRssXml)).toHaveBeenCalledWith(expect.objectContaining({
      title: "Van Life - J²Adventures",
      selfUrl: "https://jsquaredadventures.com/category/van-life/feed.xml",
      siteUrl: "https://jsquaredadventures.com/category/van-life",
    }));
  });

  it("falls back to the slug for the feed title when the category is not in the database", async () => {
    vi.mocked(getCategoryNameBySlug).mockResolvedValue(null);
    vi.mocked(listPublishedPostsByCategory).mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/category/unknown-slug/feed.xml"), {
      params: Promise.resolve({ category: "unknown-slug" }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(buildRssXml)).toHaveBeenCalledWith(expect.objectContaining({
      title: "unknown-slug - J²Adventures",
    }));
  });
});
