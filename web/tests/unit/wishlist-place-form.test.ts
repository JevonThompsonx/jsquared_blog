import { describe, expect, it } from "vitest";

import { adminWishlistPlaceFormSchema, adminWishlistPlaceUpdateFormSchema } from "@/server/forms/admin-wishlist-place";

describe("adminWishlistPlaceFormSchema", () => {
  it("accepts a valid create payload and normalizes defaults", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "  Glacier National Park  ",
      locationName: "  West Glacier, Montana  ",
      sortOrder: "",
      visited: false,
      isPublic: true,
      externalUrl: "https://example.com/glacier",
    });

    expect(parsed).toEqual({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: 0,
      visited: false,
      isPublic: true,
      externalUrl: "https://example.com/glacier",
    });
  });

  it("defaults visited and isPublic to false", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Big Bend",
      locationName: "Big Bend National Park, Texas",
      sortOrder: "2",
      externalUrl: "",
    });

    expect(parsed.visited).toBe(false);
    expect(parsed.isPublic).toBe(false);
    expect(parsed.externalUrl).toBeNull();
  });

  it("rejects blank names", () => {
    const parsed = adminWishlistPlaceFormSchema.safeParse({
      name: "   ",
      locationName: "Moab, Utah",
      externalUrl: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects blank locationName", () => {
    const parsed = adminWishlistPlaceFormSchema.safeParse({
      name: "Moab",
      locationName: "   ",
      externalUrl: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects non-https external links", () => {
    const parsed = adminWishlistPlaceFormSchema.safeParse({
      name: "Moab",
      locationName: "Moab, Utah",
      externalUrl: "http://example.com/moab",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a valid update payload with a UUID id", () => {
    const parsed = adminWishlistPlaceUpdateFormSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "1",
      externalUrl: "",
    });

    expect(parsed.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects update payloads with non-UUID ids", () => {
    const parsed = adminWishlistPlaceUpdateFormSchema.safeParse({
      id: "place-1",
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      externalUrl: "",
    });

    expect(parsed.success).toBe(false);
  });
});
