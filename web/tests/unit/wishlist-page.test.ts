import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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

const mockedGetPublicEnv = getPublicEnv as unknown as ReturnType<typeof vi.fn>;
const mockedListPublicWishlistPlaces = listPublicWishlistPlaces as unknown as ReturnType<typeof vi.fn>;

describe("WishlistPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when there are no public wishlist places", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedListPublicWishlistPlaces.mockResolvedValue([]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain("Travel Wishlist");
    expect(markup).toContain("No destinations are on the public wishlist yet.");
    expect(markup).not.toContain("Map markers:");
  });

  it("renders the wishlist map and list when public places exist", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: "test-map-key" });
    mockedListPublicWishlistPlaces.mockResolvedValue([
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
    expect(markup).toContain('rel="noopener noreferrer"');
  });

  it("renders the wishlist shell when loading places fails", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: "test-map-key" });
    mockedListPublicWishlistPlaces.mockRejectedValue(new Error("database unavailable"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain("Travel Wishlist");
    expect(markup).toContain("Wishlist temporarily unavailable. Please try again later.");
    expect(markup.match(/Wishlist temporarily unavailable\. Please try again later\./g)?.length).toBe(1);
    expect(markup).not.toContain("No destinations are on the public wishlist yet.");
    expect(markup).not.toContain("Map markers:");
    expect(markup).not.toContain('data-testid="public-wishlist-list"');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[wishlist] Failed to load public wishlist places",
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});
