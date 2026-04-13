import "server-only";

import { and, asc, eq, notExists } from "drizzle-orm";

import { posts, wishlistPlaces } from "@/drizzle/schema";
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
  visitedYear: number | null;
  imageUrl: string | null;
  detailSlug: string | null;
};

function normalizeOptionalHttpsUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
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
      visitedYear: wishlistPlaces.visitedYear,
      imageUrl: wishlistPlaces.imageUrl,
      detailSlug: wishlistPlaces.detailSlug,
    })
    .from(wishlistPlaces)
    .where(
      and(
        eq(wishlistPlaces.isPublic, true),
        notExists(
          db
            .select({ id: posts.id })
            .from(posts)
            .where(and(eq(posts.id, wishlistPlaces.linkedPostId), eq(posts.status, "published"))),
        ),
      ),
    )
    .orderBy(asc(wishlistPlaces.sortOrder), asc(wishlistPlaces.name), asc(wishlistPlaces.createdAt));

  return places.map((place) => ({
    ...place,
    externalUrl: normalizeOptionalHttpsUrl(place.externalUrl),
    imageUrl: normalizeOptionalHttpsUrl(place.imageUrl),
    detailSlug: place.detailSlug ?? null,
  }));
}

export async function getPublicWishlistPlaceBySlug(slug: string): Promise<PublicWishlistPlace | null> {
  const db = getDb();

  const [place] = await db
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
      visitedYear: wishlistPlaces.visitedYear,
      imageUrl: wishlistPlaces.imageUrl,
      detailSlug: wishlistPlaces.detailSlug,
    })
    .from(wishlistPlaces)
    .where(
      and(
        eq(wishlistPlaces.isPublic, true),
        eq(wishlistPlaces.detailSlug, slug),
        notExists(
          db
            .select({ id: posts.id })
            .from(posts)
            .where(and(eq(posts.id, wishlistPlaces.linkedPostId), eq(posts.status, "published"))),
        ),
      ),
    )
    .orderBy(asc(wishlistPlaces.sortOrder), asc(wishlistPlaces.name), asc(wishlistPlaces.createdAt));

  if (!place) {
    return null;
  }

  return {
    ...place,
    externalUrl: normalizeOptionalHttpsUrl(place.externalUrl),
    imageUrl: normalizeOptionalHttpsUrl(place.imageUrl),
    detailSlug: place.detailSlug ?? null,
  };
}
