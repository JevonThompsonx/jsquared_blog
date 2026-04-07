import { afterEach, describe, expect, it, vi } from "vitest";

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));
const mockOrderBy = vi.fn().mockResolvedValue([
  {
    id: "place-1",
    name: "Glacier National Park",
    locationName: "West Glacier, Montana",
    locationLat: 48.7596,
    locationLng: -113.787,
    locationZoom: 8,
    sortOrder: 0,
    visited: false,
    isPublic: true,
    externalUrl: "https://example.com/glacier",
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  },
]);
const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

import { createAdminWishlistPlace, listAdminWishlistPlaces } from "@/server/dal/admin-wishlist-places";

describe("admin wishlist places DAL", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persists normalized wishlist place data with generated ids and timestamps", async () => {
    await createAdminWishlistPlace({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      latitude: 48.7596,
      longitude: -113.787,
      zoom: 8,
      sortOrder: 0,
      visited: false,
      isPublic: true,
      externalUrl: null,
      createdByUserId: "admin-1",
    });

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Glacier National Park",
        locationName: "West Glacier, Montana",
        locationLat: 48.7596,
        locationLng: -113.787,
        locationZoom: 8,
        sortOrder: 0,
        visited: false,
        isPublic: true,
        externalUrl: null,
        createdByUserId: "admin-1",
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("lists wishlist places in persisted sort order", async () => {
    const result = await listAdminWishlistPlaces();

    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockOrderBy).toHaveBeenCalledOnce();
    expect(result).toEqual([
      {
        id: "place-1",
        name: "Glacier National Park",
        locationName: "West Glacier, Montana",
        locationLat: 48.7596,
        locationLng: -113.787,
        locationZoom: 8,
        sortOrder: 0,
        visited: false,
        isPublic: true,
        externalUrl: "https://example.com/glacier",
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    ]);
  });
});
