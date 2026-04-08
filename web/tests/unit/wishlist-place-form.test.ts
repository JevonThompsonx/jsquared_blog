import { describe, expect, it } from "vitest";

import { adminWishlistPlaceFormSchema, adminWishlistPlaceUpdateFormSchema } from "@/server/forms/admin-wishlist-place";

describe("adminWishlistPlaceFormSchema", () => {
  it("accepts a valid create payload and normalizes defaults", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "  Glacier National Park  ",
      locationName: "  West Glacier, Montana  ",
      latitude: "48.7596",
      longitude: "-113.7870",
      zoom: "",
      sortOrder: "",
      visited: false,
      isPublic: true,
      externalUrl: "https://example.com/glacier",
    });

    expect(parsed).toEqual({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      latitude: 48.7596,
      longitude: -113.787,
      zoom: 8,
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
      latitude: "29.1275",
      longitude: "-103.2425",
      zoom: "7",
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
      latitude: "38.5733",
      longitude: "-109.5498",
      externalUrl: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid latitude and longitude", () => {
    const latitudeResult = adminWishlistPlaceFormSchema.safeParse({
      name: "Moab",
      locationName: "Moab, Utah",
      latitude: "95",
      longitude: "-109.5498",
      externalUrl: "",
    });
    const longitudeResult = adminWishlistPlaceFormSchema.safeParse({
      name: "Moab",
      locationName: "Moab, Utah",
      latitude: "38.5733",
      longitude: "-195",
      externalUrl: "",
    });

    expect(latitudeResult.success).toBe(false);
    expect(longitudeResult.success).toBe(false);
  });

  it("rejects blank latitude and longitude strings", () => {
    const latitudeResult = adminWishlistPlaceFormSchema.safeParse({
      name: "Moab",
      locationName: "Moab, Utah",
      latitude: "   ",
      longitude: "-109.5498",
      externalUrl: "",
    });
    const longitudeResult = adminWishlistPlaceFormSchema.safeParse({
      name: "Moab",
      locationName: "Moab, Utah",
      latitude: "38.5733",
      longitude: "   ",
      externalUrl: "",
    });

    expect(latitudeResult.success).toBe(false);
    expect(longitudeResult.success).toBe(false);
  });

  it("rejects unrealistic zoom values", () => {
    const parsed = adminWishlistPlaceFormSchema.safeParse({
      name: "Moab",
      locationName: "Moab, Utah",
      latitude: "38.5733",
      longitude: "-109.5498",
      zoom: "40",
      externalUrl: "",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects non-https external links", () => {
    const parsed = adminWishlistPlaceFormSchema.safeParse({
      name: "Moab",
      locationName: "Moab, Utah",
      latitude: "38.5733",
      longitude: "-109.5498",
      externalUrl: "http://example.com/moab",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts a valid update payload with a UUID id", () => {
    const parsed = adminWishlistPlaceUpdateFormSchema.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      latitude: "48.7596",
      longitude: "-113.7870",
      zoom: "9",
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
      latitude: "48.7596",
      longitude: "-113.7870",
      externalUrl: "",
    });

    expect(parsed.success).toBe(false);
  });
});
