import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/queries/posts", () => ({
  listAllPublishedPosts: vi.fn(),
}));

vi.mock("@/server/feeds/rss", () => ({
  buildRssXml: vi.fn(() => "<rss />"),
  createRssResponse: vi.fn((xml: string) =>
    new Response(xml, {
      headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
    }),
  ),
}));

import { GET } from "@/app/feed.xml/route";
import { buildRssXml, createRssResponse } from "@/server/feeds/rss";
import { listAllPublishedPosts } from "@/server/queries/posts";

describe("GET /feed.xml", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("builds the canonical root RSS feed from all published posts", async () => {
    vi.mocked(listAllPublishedPosts).mockResolvedValue([]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(vi.mocked(listAllPublishedPosts)).toHaveBeenCalledOnce();
    expect(vi.mocked(buildRssXml)).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "J²Adventures",
        description: "Travel stories and adventures from J²Adventures.",
        siteUrl: "https://jsquaredadventures.com",
        selfUrl: "https://jsquaredadventures.com/feed.xml",
        posts: [],
      }),
    );
    expect(vi.mocked(createRssResponse)).toHaveBeenCalledWith("<rss />");
    expect(await response.text()).toBe("<rss />");
  });
});
