import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const notFoundError = new Error("NEXT_NOT_FOUND");

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw notFoundError;
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => createElement("img", { alt, src }),
}));

vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: () => createElement("div", { "data-testid": "site-header" }, "Header"),
}));

vi.mock("@/components/blog/world-map", () => ({
  WorldMap: () => createElement("div", { "data-testid": "world-map" }, "Map"),
}));

vi.mock("@/lib/env", () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_STADIA_MAPS_API_KEY: "test-key" }),
  getServerEnv: vi.fn(() => ({})),
}));

vi.mock("@/lib/auth/session", () => ({
  getAdminServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/queries/wishlist", () => ({
  getPublicWishlistPlaceBySlug: vi.fn(),
  getPublicWishlistPlaceChildren: vi.fn().mockResolvedValue([]),
}));

import WishlistDetailPage, { generateMetadata } from "@/app/(blog)/wishlist/[slug]/page";
import { getPublicWishlistPlaceBySlug } from "@/server/queries/wishlist";

describe("WishlistDetailPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the destination detail page when the slug is public", async () => {
    vi.mocked(getPublicWishlistPlaceBySlug).mockResolvedValue({
      id: "place-1",
      name: "Banff Gondola",
      locationName: "Banff, AB",
      locationLat: 51.17,
      locationLng: -115.57,
      locationZoom: 10,
      sortOrder: 0,
      visited: false,
      externalUrl: "https://example.com/banff-gondola",
      description: "Ride above the valley for a full alpine view.",
      visitedYear: 2026,
      imageUrl: "https://images.example.com/banff-gondola.jpg",
      detailSlug: "banff-gondola",
      itemType: "single",
      parentId: null,
      isPinned: false,
    });

    const markup = renderToStaticMarkup(
      await WishlistDetailPage({ params: Promise.resolve({ slug: "banff-gondola" }) }),
    );

    expect(markup).toContain("Banff Gondola");
    expect(markup).toContain("Ride above the valley for a full alpine view.");
    expect(markup).toContain("Banff, AB");
    expect(markup).toContain("2026");
    expect(markup).toContain("https://images.example.com/banff-gondola.jpg");
    expect(markup).toContain('href="https://example.com/banff-gondola"');
    expect(markup).toContain('href="/wishlist"');
  });

  it("builds metadata from the public wishlist destination", async () => {
    vi.mocked(getPublicWishlistPlaceBySlug).mockResolvedValue({
      id: "place-1",
      name: "Banff Gondola",
      locationName: "Banff, AB",
      locationLat: 51.17,
      locationLng: -115.57,
      locationZoom: 10,
      sortOrder: 0,
      visited: false,
      externalUrl: "https://example.com/banff-gondola",
      description: "Ride above the valley for a full alpine view.",
      visitedYear: 2026,
      imageUrl: "https://images.example.com/banff-gondola.jpg",
      detailSlug: "banff-gondola",
      itemType: "single",
      parentId: null,
      isPinned: false,
    });

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "banff-gondola" }) });

    expect(metadata.title).toBe("Banff Gondola | Travel Wishlist");
    expect(metadata.description).toBe("Ride above the valley for a full alpine view.");
  });

  it("notFounds when the destination slug is not public", async () => {
    vi.mocked(getPublicWishlistPlaceBySlug).mockResolvedValue(null);

    await expect(
      WishlistDetailPage({ params: Promise.resolve({ slug: "missing-place" }) }),
    ).rejects.toThrow(notFoundError);
  });
});
