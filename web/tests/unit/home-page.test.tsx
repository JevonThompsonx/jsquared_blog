import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => createElement("img", { alt, src }),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

vi.mock("@/components/blog/home-feed", () => ({
  HomeFeed: ({ initialPosts, initialSearch }: { initialPosts: Array<{ id: string }>; initialSearch?: string }) =>
    createElement("div", { "data-testid": "home-feed", "data-search": initialSearch ?? "" }, `Feed posts: ${initialPosts.length}`),
}));

vi.mock("@/components/blog/newsletter-signup-form", () => ({
  NewsletterSignupForm: ({ source }: { source: string }) => createElement("div", { "data-testid": "newsletter-signup", "data-source": source }, "Newsletter shell"),
}));

vi.mock("@/components/blog/search-input", () => ({
  SearchInput: ({ initialValue, showSuggestions }: { initialValue?: string; showSuggestions?: boolean }) =>
    createElement("div", { "data-testid": "search-input", "data-value": initialValue ?? "", "data-suggestions": String(Boolean(showSuggestions)) }, "Search input shell"),
}));

vi.mock("@/components/blog/scroll-to-stories", () => ({
  ScrollToStories: () => createElement("button", { "data-testid": "scroll-to-stories" }, "Scroll to stories"),
}));

vi.mock("@/server/queries/posts", () => ({
  listPublishedPosts: vi.fn(),
}));

import HomePage, { dynamic } from "@/app/(blog)/page";
import { listPublishedPosts } from "@/server/queries/posts";

const homePost = {
  id: "post-1",
  slug: "zion-sunrise",
  title: "Zion Sunrise",
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

describe("HomePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the route dynamic and renders the landing shell", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([homePost]);

    const markup = renderToStaticMarkup(await HomePage({}));

    expect(dynamic).toBe("force-dynamic");
    expect(listPublishedPosts).toHaveBeenCalledWith(20, 0, "");
    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("J²Adventures");
    expect(markup).toContain('data-testid="scroll-to-stories"');
    expect(markup).toContain('href="/map"');
    expect(markup).toContain('href="/feed.xml"');
    expect(markup).toContain('href="/wishlist"');
    expect(markup).toContain("A few pins are still daydreams");
    expect(markup).toContain('data-testid="newsletter-signup"');
    expect(markup).toContain('data-source="homepage-bottom"');
    expect(markup).toContain("Feed posts: 1");
  });

  it("renders the search-results branch when a query is present", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([]);

    const markup = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({ search: "Oregon" }) }));

    expect(listPublishedPosts).toHaveBeenCalledWith(20, 0, "Oregon");
    expect(markup).toContain("No results for “Oregon”");
    expect(markup).toContain('data-testid="search-input"');
    expect(markup).toContain('data-value="Oregon"');
    expect(markup).toContain('data-suggestions="true"');
    expect(markup).toContain('data-search="Oregon"');
    expect(markup).toContain("Feed posts: 0");
  });

  it("treats whitespace-only search params like the default homepage", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([homePost]);

    const markup = renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve({ search: "   " }) }));

    expect(listPublishedPosts).toHaveBeenCalledWith(20, 0, "");
    expect(markup).toContain("J²Adventures");
    expect(markup).not.toContain("Search results");
    expect(markup).not.toContain('data-testid="search-input"');
    expect(markup).toContain('data-search=""');
    expect(markup).toContain("Feed posts: 1");
  });
});
