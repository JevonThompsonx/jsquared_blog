import { wishlistPlaces } from "@/drizzle/schema";

type WishlistSeedPlace = {
  id: string;
  name: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  locationZoom: number;
  sortOrder: number;
  visited: boolean;
  isPublic: boolean;
  externalUrl: string | null;
};

export const wishlistSeedPlaces: ReadonlyArray<WishlistSeedPlace> = [
  {
    id: "wishlist-banff",
    name: "Banff road trip reset",
    locationName: "Banff National Park, Alberta",
    locationLat: 51.4968,
    locationLng: -115.9281,
    locationZoom: 10,
    sortOrder: 10,
    visited: false,
    isPublic: true,
    externalUrl: "https://parks.canada.ca/pn-np/ab/banff",
  },
  {
    id: "wishlist-dolomites",
    name: "Dolomites hut-to-hut week",
    locationName: "Dolomites, Italy",
    locationLat: 46.4102,
    locationLng: 11.844,
    locationZoom: 9,
    sortOrder: 20,
    visited: false,
    isPublic: true,
    externalUrl: "https://www.dolomiti.org/en/",
  },
  {
    id: "wishlist-torres-del-paine",
    name: "Torres del Paine trek",
    locationName: "Torres del Paine, Chile",
    locationLat: -51,
    locationLng: -73,
    locationZoom: 9,
    sortOrder: 30,
    visited: true,
    isPublic: true,
    externalUrl: "https://www.conaf.cl/parques/parque-nacional-torres-del-paine/",
  },
  {
    id: "wishlist-canyonlands",
    name: "Canyonlands needles loop",
    locationName: "Canyonlands National Park, Utah",
    locationLat: 38.2136,
    locationLng: -109.9025,
    locationZoom: 9,
    sortOrder: 40,
    visited: false,
    isPublic: false,
    externalUrl: null,
  },
];

export function createWishlistSeedRecords(createdByUserId: string, now: Date) {
  return wishlistSeedPlaces.map((place) => ({
    id: place.id,
    name: place.name,
    locationName: place.locationName,
    locationLat: place.locationLat,
    locationLng: place.locationLng,
    locationZoom: place.locationZoom,
    sortOrder: place.sortOrder,
    visited: place.visited,
    isPublic: place.isPublic,
    externalUrl: place.externalUrl,
    createdByUserId,
    createdAt: now,
    updatedAt: now,
  })) satisfies Array<typeof wishlistPlaces.$inferInsert>;
}
