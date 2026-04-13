import { describe, expect, it } from "vitest";

import type { PublicWishlistPlace } from "@/server/queries/wishlist";
import { groupWishlistByLocation } from "@/lib/wishlist/grouping";

function makePlace(overrides: Partial<PublicWishlistPlace> & { id: string; name: string; locationName: string }): PublicWishlistPlace {
  return {
    locationLat: 48.0,
    locationLng: -120.0,
    locationZoom: 8,
    sortOrder: 0,
    visited: false,
    externalUrl: null,
    description: null,
    visitedYear: null,
    imageUrl: null,
    detailSlug: null,
    ...overrides,
  };
}

describe("groupWishlistByLocation", () => {
  it("returns an empty array for an empty input list", () => {
    expect(groupWishlistByLocation([])).toEqual([]);
  });

  it("groups places that share the same locationName into one group", () => {
    const places = [
      makePlace({ id: "p1", name: "Lake Louise", locationName: "Banff, AB" }),
      makePlace({ id: "p2", name: "Moraine Lake", locationName: "Banff, AB" }),
    ];

    const groups = groupWishlistByLocation(places);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.locationName).toBe("Banff, AB");
    expect(groups[0]!.places).toHaveLength(2);
    expect(groups[0]!.places.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("produces one group per distinct locationName", () => {
    const places = [
      makePlace({ id: "p1", name: "Olympic NP", locationName: "Port Angeles, WA" }),
      makePlace({ id: "p2", name: "Banff NP", locationName: "Banff, AB" }),
      makePlace({ id: "p3", name: "Glacier NP", locationName: "West Glacier, MT" }),
    ];

    const groups = groupWishlistByLocation(places);

    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.locationName)).toEqual([
      "Port Angeles, WA",
      "Banff, AB",
      "West Glacier, MT",
    ]);
  });

  it("preserves the original place order within each group", () => {
    const places = [
      makePlace({ id: "p1", name: "First", locationName: "Seattle, WA", sortOrder: 0 }),
      makePlace({ id: "p2", name: "Second", locationName: "Seattle, WA", sortOrder: 1 }),
      makePlace({ id: "p3", name: "Third", locationName: "Seattle, WA", sortOrder: 2 }),
    ];

    const [group] = groupWishlistByLocation(places);

    expect(group!.places.map((p) => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it("preserves the first-seen order of distinct locations", () => {
    const places = [
      makePlace({ id: "p1", name: "A", locationName: "Z location" }),
      makePlace({ id: "p2", name: "B", locationName: "A location" }),
      makePlace({ id: "p3", name: "C", locationName: "Z location" }),
    ];

    const groups = groupWishlistByLocation(places);

    expect(groups[0]!.locationName).toBe("Z location");
    expect(groups[1]!.locationName).toBe("A location");
  });

  it("treats locationName values as case-sensitive", () => {
    const places = [
      makePlace({ id: "p1", name: "A", locationName: "banff, AB" }),
      makePlace({ id: "p2", name: "B", locationName: "Banff, AB" }),
    ];

    const groups = groupWishlistByLocation(places);

    expect(groups).toHaveLength(2);
  });

  it("handles a single place as a single-item group", () => {
    const places = [
      makePlace({ id: "solo", name: "Solo Spot", locationName: "Nowhere, MT" }),
    ];

    const groups = groupWishlistByLocation(places);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.places).toHaveLength(1);
    expect(groups[0]!.places[0]!.id).toBe("solo");
  });
});
