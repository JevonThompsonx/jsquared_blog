import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/queries/wishlist", () => ({
  listPublicWishlistPlaces: vi.fn(),
}));

import type { PublicWishlistPlace } from "@/server/queries/wishlist";
import { NoRoutePlannerSuggestionsError, planPublicWishlistRoute } from "@/server/services/route-planner";

const samplePlaces: PublicWishlistPlace[] = [
  {
    id: "place-1",
    name: "Olympic National Park",
    locationName: "Port Angeles, WA",
    locationLat: 48.1,
    locationLng: -123.4,
    locationZoom: 8,
    sortOrder: 0,
    visited: false,
    externalUrl: null,
    description: null,
    visitedYear: null,
    imageUrl: null,
  },
  {
    id: "place-2",
    name: "Banff National Park",
    locationName: "Banff, AB",
    locationLat: 49,
    locationLng: -123,
    locationZoom: 8,
    sortOrder: 1,
    visited: true,
    externalUrl: null,
    description: null,
    visitedYear: null,
    imageUrl: null,
  },
  {
    id: "place-3",
    name: "Glacier National Park",
    locationName: "West Glacier, MT",
    locationLat: 50,
    locationLng: -123,
    locationZoom: 8,
    sortOrder: 2,
    visited: false,
    externalUrl: null,
    description: null,
    visitedYear: null,
    imageUrl: null,
  },
];

describe("planPublicWishlistRoute", () => {
  it("excludes visited wishlist stops by default and orders suggestions along the route", async () => {
    const result = await planPublicWishlistRoute(
      {
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Calgary, AB",
        mode: "drive",
        includeVisited: false,
      },
      {
        listPlaces: async () => samplePlaces,
        provider: {
          planRoute: async () => ({
            provider: "geoapify",
            origin: { label: "Seattle, WA", lat: 47, lng: -123 },
            destination: { label: "Calgary, AB", lat: 51, lng: -123 },
            distanceMeters: 1000,
            durationSeconds: 200,
            geometry: [
              { lat: 47, lng: -123 },
              { lat: 49, lng: -123 },
              { lat: 51, lng: -123 },
            ],
          }),
        },
        maxSuggestions: 10,
      },
    );

    expect(result.suggestions.map((place) => place.id)).toEqual(["place-1", "place-3"]);
    expect(result.suggestions.every((place) => !place.visited)).toBe(true);
  });

  it("includes visited wishlist stops when requested", async () => {
    const result = await planPublicWishlistRoute(
      {
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Calgary, AB",
        mode: "drive",
        includeVisited: true,
      },
      {
        listPlaces: async () => samplePlaces,
        provider: {
          planRoute: async () => ({
            provider: "geoapify",
            origin: { label: "Seattle, WA", lat: 47, lng: -123 },
            destination: { label: "Calgary, AB", lat: 51, lng: -123 },
            distanceMeters: 1000,
            durationSeconds: 200,
            geometry: [
              { lat: 47, lng: -123 },
              { lat: 49, lng: -123 },
              { lat: 51, lng: -123 },
            ],
          }),
        },
        maxSuggestions: 10,
      },
    );

    expect(result.suggestions.map((place) => place.id)).toEqual(["place-1", "place-2", "place-3"]);
    expect(result.suggestions[1]?.visited).toBe(true);
  });

  it("caps suggestions by route relevance before ordering them for display", async () => {
    const result = await planPublicWishlistRoute(
      {
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Calgary, AB",
        mode: "drive",
        includeVisited: false,
      },
      {
        listPlaces: async () => [
          {
            ...samplePlaces[0]!,
            id: "far-early",
            sortOrder: 0,
            locationLat: 46,
            locationLng: -121,
          },
          {
            ...samplePlaces[0]!,
            id: "near-late",
            sortOrder: 1,
            locationLat: 50,
            locationLng: -123,
          },
        ],
        provider: {
          planRoute: async () => ({
            provider: "geoapify",
            origin: { label: "Seattle, WA", lat: 47, lng: -123 },
            destination: { label: "Calgary, AB", lat: 51, lng: -123 },
            distanceMeters: 1000,
            durationSeconds: 200,
            geometry: [
              { lat: 47, lng: -123 },
              { lat: 49, lng: -123 },
              { lat: 51, lng: -123 },
            ],
          }),
        },
        maxSuggestions: 1,
      },
    );

    expect(result.suggestions.map((place) => place.id)).toEqual(["near-late"]);
  });

  it("fails closed when no public wishlist places remain after visited filtering", async () => {
    await expect(planPublicWishlistRoute(
      {
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Calgary, AB",
        mode: "drive",
        includeVisited: false,
      },
      {
        listPlaces: async () => samplePlaces.filter((place) => place.visited),
        provider: {
          planRoute: async () => ({
            provider: "geoapify",
            origin: { label: "Seattle, WA", lat: 47, lng: -123 },
            destination: { label: "Calgary, AB", lat: 51, lng: -123 },
            distanceMeters: 1000,
            durationSeconds: 200,
            geometry: [
              { lat: 47, lng: -123 },
              { lat: 51, lng: -123 },
            ],
          }),
        },
        maxSuggestions: 10,
      },
    )).rejects.toBeInstanceOf(NoRoutePlannerSuggestionsError);
  });
});
