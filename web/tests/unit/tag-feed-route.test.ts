import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/dal/posts", () => ({
  getTagBySlug: vi.fn(),
}));

vi.mock("@/server/queries/posts", () => ({
  listPublishedPostsByTagSlug: vi.fn(),
}));

vi.mock("@/server/feeds/rss", () => ({
  buildRssXml: vi.fn(() => "<rss />"),
  createRssResponse: vi.fn((xml: string) => new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  })),
}));

import { GET } from "@/app/(blog)/tag/[slug]/feed.xml/route";
import { buildRssXml, createRssResponse } from "@/server/feeds/rss";
import { getTagBySlug } from "@/server/dal/posts";
import { listPublishedPostsByTagSlug } from "@/server/queries/posts";

describe("GET /tag/[slug]/feed.xml", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for whitespace-only tag slugs before tag lookup", async () => {
    const response = await GET(new Request("http://localhost/tag/%20%20/feed.xml"), {
      params: Promise.resolve({ slug: "   " }),
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid tag");
    expect(vi.mocked(getTagBySlug)).not.toHaveBeenCalled();
    expect(vi.mocked(listPublishedPostsByTagSlug)).not.toHaveBeenCalled();
  });

  it("trims valid tag slugs before tag and feed lookups", async () => {
    vi.mocked(getTagBySlug).mockResolvedValue({
      id: "tag-1",
      name: "Waterfalls",
      slug: "waterfalls",
      description: "Chasing waterfall trails.",
    });
    vi.mocked(listPublishedPostsByTagSlug).mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/tag/waterfalls/feed.xml"), {
      params: Promise.resolve({ slug: "  waterfalls  " }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(getTagBySlug)).toHaveBeenCalledWith("waterfalls");
    expect(vi.mocked(listPublishedPostsByTagSlug)).toHaveBeenCalledWith("waterfalls", 100, 0);
    expect(vi.mocked(buildRssXml)).toHaveBeenCalledWith(expect.objectContaining({
      title: "Waterfalls - J²Adventures",
      selfUrl: "https://jsquaredadventures.com/tag/waterfalls/feed.xml",
      siteUrl: "https://jsquaredadventures.com/tag/waterfalls",
    }));
    expect(vi.mocked(createRssResponse)).toHaveBeenCalled();
  });
});
