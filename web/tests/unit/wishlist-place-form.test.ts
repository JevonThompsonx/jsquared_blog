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
      description: null,
      sortOrder: 0,
      visited: false,
      isPublic: true,
      externalUrl: "https://example.com/glacier",
      visitedYear: null,
      imageUrl: null,
    });
  });

  it("defaults visited to false and new items to public", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Big Bend",
      locationName: "Big Bend National Park, Texas",
      sortOrder: "2",
      externalUrl: "",
    });

    expect(parsed.visited).toBe(false);
    expect(parsed.isPublic).toBe(true);
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

  it("accepts an optional description and trims whitespace", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
      description: "  A stunning park in Montana.  ",
    });

    expect(parsed.description).toBe("A stunning park in Montana.");
  });

  it("defaults description to null when omitted", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
    });

    expect(parsed.description).toBeNull();
  });

  it("defaults description to null when blank", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
      description: "   ",
    });

    expect(parsed.description).toBeNull();
  });

  it("rejects a description over 500 characters", () => {
    const parsed = adminWishlistPlaceFormSchema.safeParse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
      description: "x".repeat(501),
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts an optional visitedYear as a positive integer", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
      visitedYear: "2019",
    });

    expect(parsed.visitedYear).toBe(2019);
  });

  it("defaults visitedYear to null when omitted", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
    });

    expect(parsed.visitedYear).toBeNull();
  });

  it("defaults visitedYear to null when blank", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
      visitedYear: "  ",
    });

    expect(parsed.visitedYear).toBeNull();
  });

  it("rejects visitedYear outside 1900–2100 range", () => {
    const parsed = adminWishlistPlaceFormSchema.safeParse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
      visitedYear: "1800",
    });

    expect(parsed.success).toBe(false);
  });

  it("accepts an optional imageUrl as an HTTPS URL", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
      imageUrl: "https://images.example.com/glacier.jpg",
    });

    expect(parsed.imageUrl).toBe("https://images.example.com/glacier.jpg");
  });

  it("defaults imageUrl to null when omitted", () => {
    const parsed = adminWishlistPlaceFormSchema.parse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
    });

    expect(parsed.imageUrl).toBeNull();
  });

  it("rejects a non-https imageUrl", () => {
    const parsed = adminWishlistPlaceFormSchema.safeParse({
      name: "Glacier National Park",
      locationName: "West Glacier, Montana",
      sortOrder: "",
      externalUrl: "",
      imageUrl: "http://images.example.com/glacier.jpg",
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
