import { afterEach, describe, expect, it, vi } from "vitest";

const mockOrderBy = vi.fn().mockResolvedValue([]);
let whereCallCount = 0;
const mockWhere = vi.fn(() => {
  whereCallCount += 1;
  return whereCallCount % 2 === 1 ? {} : { orderBy: mockOrderBy };
});
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockDb = {
  select: mockSelect,
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

import { listPublicWishlistPlaces } from "@/server/queries/wishlist";

describe("listPublicWishlistPlaces", () => {
  afterEach(() => {
    vi.clearAllMocks();
    whereCallCount = 0;
  });

  it("returns only public wishlist places in sort order", async () => {
    mockOrderBy.mockResolvedValueOnce([
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
        description: "Beautiful alpine park in Montana",
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
      },
    ]);

    await expect(listPublicWishlistPlaces()).resolves.toEqual([
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
        description: "Beautiful alpine park in Montana",
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
      },
    ]);

    expect(mockSelect).toHaveBeenCalledTimes(2);
    expect(mockWhere).toHaveBeenCalledTimes(2);
    expect(mockOrderBy).toHaveBeenCalledOnce();
  });

  it("normalizes invalid or non-https external URLs to null", async () => {
    mockOrderBy.mockResolvedValueOnce([
      {
        id: "place-1",
        name: "Glacier National Park",
        locationName: "West Glacier, Montana",
        locationLat: 48.7596,
        locationLng: -113.787,
        locationZoom: 8,
        sortOrder: 0,
        visited: false,
        externalUrl: "javascript:alert('xss')",
        description: null,
        visitedYear: null,
        imageUrl: "http://images.example.com/glacier.jpg",
        detailSlug: null,
      },
      {
        id: "place-2",
        name: "Banff",
        locationName: "Alberta, Canada",
        locationLat: 51.1784,
        locationLng: -115.5708,
        locationZoom: 9,
        sortOrder: 1,
        visited: true,
        externalUrl: "  https://example.com/banff ",
        description: "Rocky mountain gem",
        visitedYear: 2022,
        imageUrl: "https://images.example.com/banff.jpg",
        detailSlug: "banff-rockies",
      },
    ]);

    await expect(listPublicWishlistPlaces()).resolves.toEqual([
      {
        id: "place-1",
        name: "Glacier National Park",
        locationName: "West Glacier, Montana",
        locationLat: 48.7596,
        locationLng: -113.787,
        locationZoom: 8,
        sortOrder: 0,
        visited: false,
        externalUrl: null,
        description: null,
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
      },
      {
        id: "place-2",
        name: "Banff",
        locationName: "Alberta, Canada",
        locationLat: 51.1784,
        locationLng: -115.5708,
        locationZoom: 9,
        sortOrder: 1,
        visited: true,
        externalUrl: "https://example.com/banff",
        description: "Rocky mountain gem",
        visitedYear: 2022,
        imageUrl: "https://images.example.com/banff.jpg",
        detailSlug: "banff-rockies",
      },
    ]);
  });
});
