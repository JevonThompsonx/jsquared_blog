import { describe, expect, it } from "vitest";

import { buildRssXml, createRssResponse } from "@/server/feeds/rss";
import type { BlogPost } from "@/types/blog";

function makePost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: "post-1",
    slug: "coastal-trails",
    title: "Fish & Chips <Trail>",
    description: "<p>Fresh catch & campfire stories.</p>",
    excerpt: "Fresh catch & campfire stories.",
    imageUrl: "https://images.example.com/trail.jpg",
    category: "Travel",
    createdAt: "2026-03-19T12:00:00.000Z",
    updatedAt: "2026-03-20T12:00:00.000Z",
    publishedAt: "2026-03-21T12:00:00.000Z",
    status: "published",
    layoutType: "standard",
    tags: [],
    images: [],
    source: "turso",
    locationName: null,
    locationLat: null,
    locationLng: null,
    locationZoom: null,
    iovanderUrl: null,
    commentCount: 0,
    readingTimeMinutes: 4,
    ...overrides,
  };
}

describe("RSS helpers", () => {
  it("builds RSS XML with escaped metadata and canonical post URLs", () => {
    const xml = buildRssXml({
      title: "J2 & Adventures",
      description: "Latest <stories>",
      siteUrl: "https://jsquaredadventures.com",
      selfUrl: "https://jsquaredadventures.com/feed.xml",
      posts: [makePost()],
    });

    expect(xml).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("<title>J2 &amp; Adventures</title>");
    expect(xml).toContain("<description>Latest &lt;stories&gt;</description>");
    expect(xml).toContain("<link>https://jsquaredadventures.com/posts/coastal-trails</link>");
    expect(xml).toContain("<title>Fish &amp; Chips &lt;Trail&gt;</title>");
    expect(xml).toContain("Fresh catch &amp; campfire stories.");
  });

  it("creates an RSS response with XML headers", async () => {
    const response = createRssResponse("<rss />");

    expect(response.headers.get("Content-Type")).toBe("application/rss+xml; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=1800");
    expect(await response.text()).toBe("<rss />");
  });
});
