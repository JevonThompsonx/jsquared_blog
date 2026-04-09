import { describe, expect, it } from "vitest";

import { createWishlistSeedRecords, wishlistSeedPlaces } from "@/lib/wishlist/seed-data";

describe("createWishlistSeedRecords", () => {
  it("builds stable wishlist records for a given admin user", () => {
    const now = new Date("2026-04-09T12:00:00.000Z");

    const result = createWishlistSeedRecords("wishlist-seed-admin", now);

    expect(result).toHaveLength(wishlistSeedPlaces.length);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "wishlist-banff",
          createdByUserId: "wishlist-seed-admin",
          createdAt: now,
          updatedAt: now,
          isPublic: true,
        }),
        expect.objectContaining({
          id: "wishlist-canyonlands",
          createdByUserId: "wishlist-seed-admin",
          isPublic: false,
        }),
      ]),
    );
  });

  it("only emits null or https external urls", () => {
    const result = createWishlistSeedRecords("wishlist-seed-admin", new Date("2026-04-09T12:00:00.000Z"));

    expect(result.every((place) => place.externalUrl === null || place.externalUrl.startsWith("https://"))).toBe(true);
  });

  it("keeps sort orders unique so the public wishlist stays deterministic", () => {
    const result = createWishlistSeedRecords("wishlist-seed-admin", new Date("2026-04-09T12:00:00.000Z"));
    const sortOrders = result.map((place) => place.sortOrder);

    expect(new Set(sortOrders).size).toBe(sortOrders.length);
  });
});
