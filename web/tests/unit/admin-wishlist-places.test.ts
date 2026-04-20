import { afterEach, describe, expect, it, vi } from "vitest";

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));
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
    visitedYear: null,
    imageUrl: null,
    detailSlug: null,
    linkedPostId: null,
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
  },
]);
const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockDb = {
  delete: mockDelete,
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

import {
  createAdminWishlistPlace,
  deactivateLinkedWishlistPlaces,
  deleteAdminWishlistPlace,
  listAdminWishlistPlaces,
  setWishlistPlaceLinkedPost,
  updateAdminWishlistPlace,
} from "@/server/dal/admin-wishlist-places";

describe("admin wishlist places DAL", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persists normalized wishlist place data with generated ids and timestamps", async () => {
    await createAdminWishlistPlace({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      description: null,
      latitude: 48.7596,
      longitude: -113.787,
      zoom: 8,
      sortOrder: 0,
      visited: false,
      isPublic: true,
      externalUrl: null,
      visitedYear: null,
      imageUrl: null,
      detailSlug: null,
      itemType: "single",
      parentId: null,
      createdByUserId: "admin-1",
      isPinned: false,
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
        visitedYear: null,
        imageUrl: null,
        detailSlug: null,
        linkedPostId: null,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        updatedAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    ]);
  });

  it("updates persisted wishlist place data and refreshes updatedAt", async () => {
    await updateAdminWishlistPlace({
      id: "place-1",
      name: "Updated Glacier National Park",
      locationName: "Updated West Glacier, Montana",
      description: null,
      latitude: 48.7,
      longitude: -113.7,
      zoom: 10,
      sortOrder: 4,
      visited: true,
      isPublic: false,
      externalUrl: "https://example.com/updated-glacier",
      visitedYear: 2023,
      imageUrl: "https://example.com/glacier.jpg",
      detailSlug: "updated-glacier",
      itemType: "single",
      parentId: null,
      isPinned: false,
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Updated Glacier National Park",
        locationName: "Updated West Glacier, Montana",
        locationLat: 48.7,
        locationLng: -113.7,
        locationZoom: 10,
        sortOrder: 4,
        visited: true,
        isPublic: false,
        externalUrl: "https://example.com/updated-glacier",
        visitedYear: 2023,
        imageUrl: "https://example.com/glacier.jpg",
        detailSlug: "updated-glacier",
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("deletes wishlist places by id", async () => {
    await deleteAdminWishlistPlace("place-1");

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockDeleteWhere).toHaveBeenCalledOnce();
  });

  it("links a wishlist place to a draft post by id", async () => {
    await setWishlistPlaceLinkedPost("place-1", "post-abc");

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        linkedPostId: "post-abc",
        updatedAt: expect.any(Date),
      }),
    );
    expect(mockUpdateWhere).toHaveBeenCalledOnce();
  });

  it("clears a wishlist place linked post when postId is null", async () => {
    await setWishlistPlaceLinkedPost("place-1", null);

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        linkedPostId: null,
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("deactivates wishlist places linked to published post ids", async () => {
    await deactivateLinkedWishlistPlaces(["post-abc", "post-xyz"]);

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isPublic: false,
        updatedAt: expect.any(Date),
      }),
    );
    expect(mockUpdateWhere).toHaveBeenCalledOnce();
  });

  it("skips deactivation when published post ids list is empty", async () => {
    await deactivateLinkedWishlistPlaces([]);

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
