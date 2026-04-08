import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    createElement("div", { "data-testid": "filtered-feed", "data-category": apiParams.category }, `${emptyTitle} | Feed posts: ${initialPosts.length}`),
}));

vi.mock("@/server/dal/posts", () => ({
  countPublishedPostsByCategory: vi.fn(),
}));

vi.mock("@/server/queries/posts", () => ({
  listPublishedPostsByCategory: vi.fn(),
}));

import CategoryPage, { dynamic, generateMetadata } from "@/app/(blog)/category/[category]/page";
import { countPublishedPostsByCategory } from "@/server/dal/posts";
import { listPublishedPostsByCategory } from "@/server/queries/posts";
import { notFound } from "next/navigation";

const categoryPost = {
  id: "post-1",
  slug: "van-camping-101",
  title: "Van Camping 101",
  description: null,
  excerpt: null,
  imageUrl: null,
  category: "Van Life",
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

describe("CategoryPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the route dynamic and builds encoded category metadata", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ category: "Van%20Life" }) });

    expect(dynamic).toBe("force-dynamic");
    expect(metadata.title).toBe("Van Life – J²Adventures");
    expect(metadata.alternates?.types?.["application/rss+xml"]).toBe("https://jsquaredadventures.com/category/Van%20Life/feed.xml");
  });

  it("renders the category shell with the filtered feed contract", async () => {
    vi.mocked(listPublishedPostsByCategory).mockResolvedValue([categoryPost]);
    vi.mocked(countPublishedPostsByCategory).mockResolvedValue(1);

    const markup = renderToStaticMarkup(await CategoryPage({ params: Promise.resolve({ category: "Van%20Life" }) }));

    expect(listPublishedPostsByCategory).toHaveBeenCalledWith("Van Life", 20, 0);
    expect(countPublishedPostsByCategory).toHaveBeenCalledWith("Van Life");
    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("Van Life");
    expect(markup).toContain("1 adventure");
    expect(markup).toContain('href="/"');
    expect(markup).toContain('data-testid="filtered-feed"');
    expect(markup).toContain('data-category="Van Life"');
    expect(markup).toContain("Feed posts: 1");
  });

  it("fails closed on malformed category params before querying posts", async () => {
    await expect(CategoryPage({ params: Promise.resolve({ category: "%E0%A4%A" }) })).rejects.toThrow(notFoundError);

    expect(notFound).toHaveBeenCalled();
    expect(listPublishedPostsByCategory).not.toHaveBeenCalled();
    expect(countPublishedPostsByCategory).not.toHaveBeenCalled();
  });

  it("fails closed on percent-encoded whitespace-only category params", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ category: "%20%20" }) });

    await expect(CategoryPage({ params: Promise.resolve({ category: "%20%20" }) })).rejects.toThrow(notFoundError);

    expect(metadata).toEqual({});
    expect(notFound).toHaveBeenCalled();
    expect(listPublishedPostsByCategory).not.toHaveBeenCalled();
    expect(countPublishedPostsByCategory).not.toHaveBeenCalled();
  });
});
