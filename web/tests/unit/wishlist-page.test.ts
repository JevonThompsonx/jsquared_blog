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

vi.mock("@/lib/auth/session", () => ({
  getAdminServerSession: vi.fn(),
}));

import { getPublicEnv } from "@/lib/env";
import { getAdminServerSession } from "@/lib/auth/session";
import WishlistPage from "@/app/(blog)/wishlist/page";
import { listPublicWishlistPlaces } from "@/server/queries/wishlist";

const mockedGetPublicEnv = getPublicEnv as unknown as ReturnType<typeof vi.fn>;
const mockedListPublicWishlistPlaces = listPublicWishlistPlaces as unknown as ReturnType<typeof vi.fn>;
const mockedGetAdminServerSession = getAdminServerSession as unknown as ReturnType<typeof vi.fn>;

describe("WishlistPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an empty state when there are no public wishlist places", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedListPublicWishlistPlaces.mockResolvedValue([]);
    mockedGetAdminServerSession.mockResolvedValue(null);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain("Travel Wishlist");
    expect(markup).toContain("No destinations are on the public wishlist yet.");
    expect(markup).not.toContain("Map markers:");
  });

  it("renders the wishlist map and list when public places exist", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: "test-map-key" });
    mockedGetAdminServerSession.mockResolvedValue(null);
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
        description: null,
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
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
    mockedGetAdminServerSession.mockResolvedValue(null);
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

  it("renders a location group header for each distinct locationName", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedGetAdminServerSession.mockResolvedValue(null);
    mockedListPublicWishlistPlaces.mockResolvedValue([
      {
        id: "p1",
        name: "Lake Louise",
        locationName: "Banff, AB",
        locationLat: 51.4,
        locationLng: -116.2,
        locationZoom: 10,
        sortOrder: 0,
        visited: false,
        externalUrl: null,
        description: null,
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
      },
      {
        id: "p2",
        name: "Olympic NP",
        locationName: "Port Angeles, WA",
        locationLat: 48.1,
        locationLng: -123.4,
        locationZoom: 8,
        sortOrder: 1,
        visited: false,
        externalUrl: null,
        description: null,
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
      },
    ]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain('data-testid="wishlist-location-group"');
    expect(markup).toContain("Banff, AB");
    expect(markup).toContain("Port Angeles, WA");
  });

  it("renders a visitedYear badge when the place has a visitedYear", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedGetAdminServerSession.mockResolvedValue(null);
    mockedListPublicWishlistPlaces.mockResolvedValue([
      {
        id: "p1",
        name: "Banff NP",
        locationName: "Banff, AB",
        locationLat: 51.4,
        locationLng: -116.2,
        locationZoom: 10,
        sortOrder: 0,
        visited: true,
        externalUrl: null,
        description: null,
        visitedYear: 2022,
        imageUrl: null,
        detailSlug: null,
      },
    ]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain("2022");
    expect(markup).toContain('data-testid="visited-year-badge"');
  });

  it("renders a place image when imageUrl is present", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedGetAdminServerSession.mockResolvedValue(null);
    mockedListPublicWishlistPlaces.mockResolvedValue([
      {
        id: "p1",
        name: "Moraine Lake",
        locationName: "Banff, AB",
        locationLat: 51.3,
        locationLng: -116.2,
        locationZoom: 12,
        sortOrder: 0,
        visited: false,
        externalUrl: null,
        description: null,
        visitedYear: null,
        imageUrl: "https://example.com/moraine.jpg",
        detailSlug: null,
      },
    ]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain('data-testid="place-image"');
    expect(markup).toContain("https://example.com/moraine.jpg");
  });

  it("does not render a place image when imageUrl is null", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedGetAdminServerSession.mockResolvedValue(null);
    mockedListPublicWishlistPlaces.mockResolvedValue([
      {
        id: "p1",
        name: "Moraine Lake",
        locationName: "Banff, AB",
        locationLat: 51.3,
        locationLng: -116.2,
        locationZoom: 12,
        sortOrder: 0,
        visited: false,
        externalUrl: null,
        description: null,
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
      },
    ]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).not.toContain('data-testid="place-image"');
  });

  it("renders an admin edit link per place when an admin session is active", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedGetAdminServerSession.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mockedListPublicWishlistPlaces.mockResolvedValue([
      {
        id: "place-99",
        name: "Glacier NP",
        locationName: "West Glacier, MT",
        locationLat: 48.7,
        locationLng: -113.8,
        locationZoom: 8,
        sortOrder: 0,
        visited: false,
        externalUrl: null,
        description: null,
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
      },
    ]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain('data-testid="admin-edit-place-link"');
    expect(markup).toContain('href="/admin/wishlist#place-place-99"');
  });

  it("does not render admin edit links for non-admin visitors", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedGetAdminServerSession.mockResolvedValue(null);
    mockedListPublicWishlistPlaces.mockResolvedValue([
      {
        id: "place-99",
        name: "Glacier NP",
        locationName: "West Glacier, MT",
        locationLat: 48.7,
        locationLng: -113.8,
        locationZoom: 8,
        sortOrder: 0,
        visited: false,
        externalUrl: null,
        description: null,
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
      },
    ]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).not.toContain('data-testid="admin-edit-place-link"');
  });

  it("renders an internal destination link when detailSlug is present", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedGetAdminServerSession.mockResolvedValue(null);
    mockedListPublicWishlistPlaces.mockResolvedValue([
      {
        id: "place-42",
        name: "Banff Gondola",
        locationName: "Banff, AB",
        locationLat: 51.17,
        locationLng: -115.57,
        locationZoom: 10,
        sortOrder: 0,
        visited: false,
        externalUrl: "https://example.com/banff-gondola",
        description: "Ride above the valley.",
        visitedYear: 2026,
        imageUrl: "https://images.example.com/banff-gondola.jpg",
        detailSlug: "banff-gondola",
      },
    ]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).toContain('href="/wishlist/banff-gondola"');
  });

  it("does not render an internal destination link when detailSlug is absent", async () => {
    mockedGetPublicEnv.mockReturnValue({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: undefined });
    mockedGetAdminServerSession.mockResolvedValue(null);
    mockedListPublicWishlistPlaces.mockResolvedValue([
      {
        id: "place-42",
        name: "Banff Gondola",
        locationName: "Banff, AB",
        locationLat: 51.17,
        locationLng: -115.57,
        locationZoom: 10,
        sortOrder: 0,
        visited: false,
        externalUrl: "https://example.com/banff-gondola",
        description: "Ride above the valley.",
        visitedYear: 2026,
        imageUrl: "https://images.example.com/banff-gondola.jpg",
        detailSlug: null,
      },
    ]);

    const markup = renderToStaticMarkup(await WishlistPage());

    expect(markup).not.toContain('href="/wishlist/banff-gondola"');
  });
});

