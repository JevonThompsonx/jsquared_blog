import { afterEach, describe, expect, it, vi } from "vitest";

const mockOrderBy = vi.fn().mockResolvedValue([]);
const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
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
      },
    ]);

    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockWhere).toHaveBeenCalledOnce();
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
      },
    ]);
  });
});
