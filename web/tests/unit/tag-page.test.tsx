import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const notFoundError = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

vi.mock("@/components/blog/filtered-feed", () => ({
  FilteredFeed: ({ apiParams, emptyTitle, initialPosts }: { apiParams: Record<string, string>; emptyTitle: string; initialPosts: Array<{ id: string }> }) =>
    createElement("div", { "data-testid": "filtered-feed", "data-tag": apiParams.tag }, `${emptyTitle} | Feed posts: ${initialPosts.length}`),
}));

vi.mock("@/server/dal/posts", () => ({
  countPublishedPostsByTagSlug: vi.fn(),
  getTagBySlug: vi.fn(),
}));

vi.mock("@/server/queries/posts", () => ({
  listPublishedPostsByTagSlug: vi.fn(),
}));

import TagPage, { dynamic, generateMetadata } from "@/app/(blog)/tag/[slug]/page";
import { countPublishedPostsByTagSlug, getTagBySlug } from "@/server/dal/posts";
import { listPublishedPostsByTagSlug } from "@/server/queries/posts";
import { notFound } from "next/navigation";

const taggedPost = {
  id: "post-1",
  slug: "waterfall-weekend",
  title: "Waterfall Weekend",
  description: null,
  excerpt: null,
  imageUrl: null,
  category: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  status: "published" as const,
  tags: [],
  images: [],
  source: "turso" as const,
  locationName: null,
  locationLat: null,
  locationLng: null,
  locationZoom: null,
  iovanderUrl: null,
  commentCount: 0,
};

describe("TagPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the route dynamic and builds tag metadata", async () => {
    vi.mocked(getTagBySlug).mockResolvedValue({
      id: "tag-1",
      name: "Waterfalls",
      slug: "waterfalls",
      description: "Chasing waterfall trails.",
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "waterfalls" }) });

    expect(dynamic).toBe("force-dynamic");
    expect(metadata.title).toBe("Waterfalls – J²Adventures");
    expect(metadata.alternates?.types?.["application/rss+xml"]).toBe("https://jsquaredadventures.com/tag/waterfalls/feed.xml");
  });

  it("renders the tag shell with the filtered feed contract", async () => {
    vi.mocked(getTagBySlug).mockResolvedValue({
      id: "tag-1",
      name: "Waterfalls",
      slug: "waterfalls",
      description: "Chasing waterfall trails.",
    });
    vi.mocked(listPublishedPostsByTagSlug).mockResolvedValue([taggedPost]);
    vi.mocked(countPublishedPostsByTagSlug).mockResolvedValue(1);

    const markup = renderToStaticMarkup(await TagPage({ params: Promise.resolve({ slug: "waterfalls" }) }));

    expect(getTagBySlug).toHaveBeenCalledWith("waterfalls");
    expect(listPublishedPostsByTagSlug).toHaveBeenCalledWith("waterfalls", 20, 0);
    expect(countPublishedPostsByTagSlug).toHaveBeenCalledWith("waterfalls");
    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("Waterfalls");
    expect(markup).toContain("1 adventure");
    expect(markup).toContain('data-testid="filtered-feed"');
    expect(markup).toContain('data-tag="waterfalls"');
    expect(markup).toContain("Feed posts: 1");
  });

  it("notFounds when the tag does not exist", async () => {
    vi.mocked(getTagBySlug).mockResolvedValue(null);
    vi.mocked(listPublishedPostsByTagSlug).mockResolvedValue([]);
    vi.mocked(countPublishedPostsByTagSlug).mockResolvedValue(0);

    await expect(TagPage({ params: Promise.resolve({ slug: "missing-tag" }) })).rejects.toThrow(notFoundError);
    expect(notFound).toHaveBeenCalled();
  });

  it("fails closed on whitespace-only tag slugs before tag and post lookups", async () => {
    await expect(TagPage({ params: Promise.resolve({ slug: "   " }) })).rejects.toThrow(notFoundError);

    expect(notFound).toHaveBeenCalled();
    expect(getTagBySlug).not.toHaveBeenCalled();
    expect(listPublishedPostsByTagSlug).not.toHaveBeenCalled();
    expect(countPublishedPostsByTagSlug).not.toHaveBeenCalled();
  });

  it("trims valid tag slugs before metadata and page lookups", async () => {
    vi.mocked(getTagBySlug).mockResolvedValue({
      id: "tag-1",
      name: "Waterfalls",
      slug: "waterfalls",
      description: "Chasing waterfall trails.",
    });
    vi.mocked(listPublishedPostsByTagSlug).mockResolvedValue([taggedPost]);
    vi.mocked(countPublishedPostsByTagSlug).mockResolvedValue(1);

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "  waterfalls  " }) });
    const markup = renderToStaticMarkup(await TagPage({ params: Promise.resolve({ slug: "  waterfalls  " }) }));

    expect(metadata.title).toBe("Waterfalls – J²Adventures");
    expect(getTagBySlug).toHaveBeenNthCalledWith(1, "waterfalls");
    expect(getTagBySlug).toHaveBeenNthCalledWith(2, "waterfalls");
    expect(listPublishedPostsByTagSlug).toHaveBeenCalledWith("waterfalls", 20, 0);
    expect(countPublishedPostsByTagSlug).toHaveBeenCalledWith("waterfalls");
    expect(markup).toContain('data-tag="waterfalls"');
  });
});
