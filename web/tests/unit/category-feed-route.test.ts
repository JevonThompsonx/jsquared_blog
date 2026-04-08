import { afterEach, describe, expect, it, vi } from "vitest";

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
    expect(vi.mocked(listPublishedPostsByCategory)).not.toHaveBeenCalled();
  });

  it("trims and decodes valid category params before building the feed", async () => {
    vi.mocked(listPublishedPostsByCategory).mockResolvedValue([]);

    const response = await GET(new Request("http://localhost/category/Van%20Life/feed.xml"), {
      params: Promise.resolve({ category: "  Van%20Life  " }),
    });

    expect(response.status).toBe(200);
    expect(vi.mocked(listPublishedPostsByCategory)).toHaveBeenCalledWith("Van Life", 100, 0);
    expect(vi.mocked(buildRssXml)).toHaveBeenCalledWith(expect.objectContaining({
      title: "Van Life - J²Adventures",
      selfUrl: "https://jsquaredadventures.com/category/Van%20Life/feed.xml",
      siteUrl: "https://jsquaredadventures.com/category/Van%20Life",
    }));
  });
});
