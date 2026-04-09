import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header shell"),
}));

vi.mock("@/components/blog/world-map", () => ({
  WorldMap: ({ apiKey, posts }: { apiKey: string; posts: Array<{ id: string }> }) =>
    createElement("div", { "data-testid": "world-map", "data-api-key": apiKey }, `Map markers: ${posts.length}`),
}));

vi.mock("@/lib/env", () => ({
  getPublicEnv: vi.fn(),
}));

vi.mock("@/server/queries/posts", () => ({
  listAllPublishedPosts: vi.fn(),
}));

import MapPage, { dynamic, metadata } from "@/app/(blog)/map/page";
import { getPublicEnv } from "@/lib/env";
import { listAllPublishedPosts } from "@/server/queries/posts";

const mockedGetPublicEnv = getPublicEnv as unknown as ReturnType<typeof vi.fn>;
const mockedListAllPublishedPosts = listAllPublishedPosts as unknown as ReturnType<typeof vi.fn>;

const mappedPost = {
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
  locationLat: 37.3,
  locationLng: -113,
  locationZoom: null,
  iovanderUrl: null,
  commentCount: 0,
};

const unmappedPost = {
  ...mappedPost,
  id: "post-2",
  slug: "gear-roundup",
  title: "Gear Roundup",
  locationLat: null,
  locationLng: null,
};

describe("MapPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the route dynamic and exposes map metadata", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.title).toBe("Adventure Map");
  });

  it("renders a fallback when the public map key is missing", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedListAllPublishedPosts.mockResolvedValue([]);

    const markup = renderToStaticMarkup(await MapPage());

    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("Stories will appear here as locations are added.");
    expect(markup).toContain("Map unavailable");
    expect(markup).toContain("NEXT_PUBLIC_STADIA_MAPS_API_KEY");
    expect(markup).not.toContain('data-testid="world-map"');
  });

  it("renders the world map with the mapped story count when the public key exists", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: "test-map-key" });
    mockedListAllPublishedPosts.mockResolvedValue([mappedPost, unmappedPost]);

    const markup = renderToStaticMarkup(await MapPage());

    expect(markup).toContain("1 story pinned to the map.");
    expect(markup).toContain('data-testid="world-map"');
    expect(markup).toContain('data-api-key="test-map-key"');
    expect(markup).toContain("Map markers: 2");
  });

  it("counts only stories with complete coordinates in the summary", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedListAllPublishedPosts.mockResolvedValue([
      {
        ...mappedPost,
        id: "post-3",
        slug: "half-mapped-story",
        title: "Half Mapped Story",
        locationLng: null,
      },
    ]);
    
    const markup = renderToStaticMarkup(await MapPage());

    expect(markup).toContain("Stories will appear here as locations are added.");
    expect(markup).toContain("Map unavailable");
  });

  it("renders the map page shell when loading posts fails", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: "test-map-key" });
    mockedListAllPublishedPosts.mockRejectedValue(new Error("database unavailable"));

    const markup = renderToStaticMarkup(await MapPage());

    expect(markup).toContain('data-testid="site-header"');
    expect(markup).toContain("Adventure Map");
    expect(markup).toContain("Story locations are temporarily unavailable.");
    expect(markup).toContain("Map unavailable");
    expect(markup).toContain("temporarily unavailable");
    expect(markup).not.toContain("Stories will appear here as locations are added.");
    expect(markup).not.toContain('data-testid="world-map"');
  });
});
