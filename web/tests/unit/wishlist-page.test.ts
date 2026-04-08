import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header"),
}));

vi.mock("@/components/blog/world-map", () => ({
  WorldMap: ({ posts }: { posts: Array<{ id: string }> }) => createElement("div", { "data-testid": "world-map" }, `Map markers: ${posts.length}`),
}));

vi.mock("@/server/queries/wishlist", () => ({
  listPublicWishlistPlaces: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getPublicEnv: vi.fn(),
}));

import { getPublicEnv } from "@/lib/env";
import WishlistPage from "@/app/(blog)/wishlist/page";
import { listPublicWishlistPlaces } from "@/server/queries/wishlist";

describe("WishlistPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when there are no public wishlist places", async () => {
    vi.mocked(getPublicEnv).mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    vi.mocked(listPublicWishlistPlaces).mockResolvedValue([]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain("Travel Wishlist");
    expect(markup).toContain("No destinations are on the public wishlist yet.");
    expect(markup).not.toContain("Map markers:");
  });

  it("renders the wishlist map and list when public places exist", async () => {
    vi.mocked(getPublicEnv).mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: "test-map-key" });
    vi.mocked(listPublicWishlistPlaces).mockResolvedValue([
      {
        id: "place-1",
        name: "Glacier National Park",
        locationName: "West Glacier, Montana",
        locationLat: 48.7596,
        locationLng: -113.787,
        locationZoom: 8,
        sortOrder: 0,
        visited: false,
        externalUrl: "https://example.com/glacier",
      },
    ]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain("Travel Wishlist");
    expect(markup).toContain("Map markers: 1");
    expect(markup).toContain("Glacier National Park");
    expect(markup).toContain("West Glacier, Montana");
    expect(markup).toContain('data-testid="public-wishlist-list"');
    expect(markup).toContain('data-testid="public-wishlist-item"');
    expect(markup).toContain('data-place-id="place-1"');
    expect(markup).toContain('href="https://example.com/glacier"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer"');
  });
});
