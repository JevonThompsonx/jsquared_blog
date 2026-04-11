import "server-only";

import { asc, eq } from "drizzle-orm";

import { wishlistPlaces } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type PublicWishlistPlace = {
  id: string;
  name: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  locationZoom: number;
  sortOrder: number;
  visited: boolean;
  externalUrl: string | null;
  description: string | null;
};

function normalizePublicWishlistExternalUrl(externalUrl: string | null): string | null {
  if (!externalUrl) {
    return null;
  }

  const trimmedExternalUrl = externalUrl.trim();

  if (!trimmedExternalUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedExternalUrl);
    return parsedUrl.protocol === "https:" ? parsedUrl.toString() : null;
  } catch {
    return null;
  }
}

export async function listPublicWishlistPlaces(): Promise<PublicWishlistPlace[]> {
  const db = getDb();

  const places = await db
    .select({
      id: wishlistPlaces.id,
      name: wishlistPlaces.name,
      locationName: wishlistPlaces.locationName,
      locationLat: wishlistPlaces.locationLat,
      locationLng: wishlistPlaces.locationLng,
      locationZoom: wishlistPlaces.locationZoom,
      sortOrder: wishlistPlaces.sortOrder,
      visited: wishlistPlaces.visited,
      externalUrl: wishlistPlaces.externalUrl,
      description: wishlistPlaces.description,
    })
    .from(wishlistPlaces)
    .where(eq(wishlistPlaces.isPublic, true))
    .orderBy(asc(wishlistPlaces.sortOrder), asc(wishlistPlaces.name), asc(wishlistPlaces.createdAt));

  return places.map((place) => ({
    ...place,
    externalUrl: normalizePublicWishlistExternalUrl(place.externalUrl),
  }));
}
