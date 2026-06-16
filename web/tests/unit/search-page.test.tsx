import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

vi.mock("@/components/blog/filtered-feed", () => ({
  FilteredFeed: ({
    apiParams,
    emptyTitle,
    emptyDescription,
    initialPosts,
  }: {
    apiParams: Record<string, string>;
    emptyTitle: string;
    emptyDescription: string;
    initialPosts: Array<{ id: string }>;
  }) =>
    createElement(
      "div",
      {
        "data-testid": "filtered-feed",
        "data-search": apiParams.search ?? "",
      },
      `${emptyTitle} | ${emptyDescription} | Feed posts: ${initialPosts.length}`,
    ),
}));

vi.mock("@/components/blog/search-input", () => ({
  SearchInput: ({
    initialValue,
    placeholder,
    showSuggestions,
  }: {
    initialValue?: string;
    placeholder?: string;
    showSuggestions?: boolean;
  }) =>
    createElement(
      "div",
      {
        "data-testid": "search-input",
        "data-value": initialValue ?? "",
        "data-placeholder": placeholder ?? "",
        "data-suggestions": String(Boolean(showSuggestions)),
      },
      "Search input shell",
    ),
}));

vi.mock("@/server/queries/posts", () => ({
  listPublishedPosts: vi.fn(),
}));

import SearchPage, { dynamic } from "@/app/(blog)/search/page";
import { listPublishedPosts } from "@/server/queries/posts";

const samplePost = {
  id: "post-1",
  slug: "sierra-sunrise",
  title: "Sierra Sunrise",
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

describe("SearchPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the route dynamic and renders the empty-query prompt with search input", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([samplePost]);

    const markup = renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve({}) }));

    expect(dynamic).toBe("force-dynamic");
    expect(listPublishedPosts).toHaveBeenCalledWith(20, 0, "");
    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("Search adventures");
    expect(markup).toContain('data-testid="search-input"');
    expect(markup).toContain('data-value=""');
    expect(markup).toContain('data-placeholder="Search stories… (⌘K)"');
    expect(markup).toContain('data-suggestions="true"');
    expect(markup).toContain('data-testid="filtered-feed"');
    expect(markup).toContain("data-search=\"\"");
  });

  it("renders the search input pre-filled with the q param and forwards to FilteredFeed", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([samplePost]);

    const markup = renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve({ q: "Sierra" }) }));

    expect(listPublishedPosts).toHaveBeenCalledWith(20, 0, "Sierra");
    expect(markup).toContain("Results for “Sierra”");
    expect(markup).toContain('data-value="Sierra"');
    expect(markup).toContain("data-search=\"Sierra\"");
  });

  it("trims whitespace-only q params to an empty query and shows the start-search empty state", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([]);

    const markup = renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve({ q: "   " }) }));

    expect(listPublishedPosts).toHaveBeenCalledWith(20, 0, "");
    expect(markup).toContain('data-value=""');
    expect(markup).toContain("data-search=\"\"");
  });

  it("renders the no-results empty state when results are empty for a non-empty query", async () => {
    vi.mocked(listPublishedPosts).mockResolvedValue([]);

    const markup = renderToStaticMarkup(
      await SearchPage({ searchParams: Promise.resolve({ q: "NowhereVille" }) }),
    );

    expect(listPublishedPosts).toHaveBeenCalledWith(20, 0, "NowhereVille");
    expect(markup).toContain("No results for “NowhereVille”");
    expect(markup).toContain("Try a place name, a season, or a road-trip keyword");
  });
});
