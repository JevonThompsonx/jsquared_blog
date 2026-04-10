import { describe, expect, it } from "vitest";

import { getWishlistSurfaceState, parseWishlistLocationSelection } from "@/lib/wishlist/workflow";

describe("wishlist workflow helpers", () => {
  it("parses a validated wishlist location selection payload", () => {
    expect(
      parseWishlistLocationSelection(
        JSON.stringify({
          provider: "nominatim",
          placeId: "12345",
          locationName: "  Banff, Alberta, Canada  ",
          latitude: 51.1784,
          longitude: -115.5708,
          zoom: 10,
          kind: "town",
        }),
      ),
    ).toEqual({
      provider: "nominatim",
      placeId: "12345",
      locationName: "Banff, Alberta, Canada",
      latitude: 51.1784,
      longitude: -115.5708,
      zoom: 10,
      kind: "town",
    });
  });

  it("rejects malformed wishlist location selections", () => {
    expect(() =>
      parseWishlistLocationSelection(
        JSON.stringify({
          provider: "nominatim",
          placeId: "",
          locationName: "Banff",
          latitude: 999,
          longitude: -115.5708,
          zoom: 10,
          kind: "town",
        }),
      ),
    ).toThrow("Invalid wishlist location selection");
  });

  it("keeps unlinked wishlist items visible on admin and public surfaces", () => {
    expect(getWishlistSurfaceState({ linkedPostId: null, linkedPostStatus: null })).toEqual({
      isCheckedOff: false,
      shouldShowInAdmin: true,
      shouldShowInPublic: true,
    });
  });

  it("keeps draft-linked wishlist items visible until publication", () => {
    expect(getWishlistSurfaceState({ linkedPostId: "post-1", linkedPostStatus: "draft" })).toEqual({
      isCheckedOff: true,
      shouldShowInAdmin: true,
      shouldShowInPublic: true,
    });
  });

  it("keeps scheduled linked wishlist items visible until publication", () => {
    expect(getWishlistSurfaceState({ linkedPostId: "post-1", linkedPostStatus: "scheduled" })).toEqual({
      isCheckedOff: true,
      shouldShowInAdmin: true,
      shouldShowInPublic: true,
    });
  });

  it("removes published linked wishlist items from wishlist surfaces", () => {
    expect(getWishlistSurfaceState({ linkedPostId: "post-1", linkedPostStatus: "published" })).toEqual({
      isCheckedOff: true,
      shouldShowInAdmin: false,
      shouldShowInPublic: false,
    });
  });
});
