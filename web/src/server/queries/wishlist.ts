import "server-only";

import { and, asc, desc, eq, isNull, notExists } from "drizzle-orm";

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
  itemType: "single" | "multi";
  isPinned: boolean;
  parentId: string | null;
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

function mapPlace(place: {
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
  itemType: "single" | "multi";
  isPinned: boolean;
  parentId: string | null;
}): PublicWishlistPlace {
  return {
    ...place,
    externalUrl: normalizeOptionalHttpsUrl(place.externalUrl),
    imageUrl: normalizeOptionalHttpsUrl(place.imageUrl),
    detailSlug: place.detailSlug ?? null,
  };
}

const PLACE_SELECT = {
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
  itemType: wishlistPlaces.itemType,
  isPinned: wishlistPlaces.isPinned,
  parentId: wishlistPlaces.parentId,
} as const;

export async function listPublicWishlistPlaces(): Promise<PublicWishlistPlace[]> {
  try {
    const db = getDb();

    const places = await db
      .select(PLACE_SELECT)
      .from(wishlistPlaces)
      .where(
        and(
          eq(wishlistPlaces.isPublic, true),
          // Only top-level items (not children of a multi-site parent)
          isNull(wishlistPlaces.parentId),
          notExists(
            db
              .select({ id: posts.id })
              .from(posts)
              .where(and(eq(posts.id, wishlistPlaces.linkedPostId), eq(posts.status, "published"))),
          ),
        ),
      )
      .orderBy(desc(wishlistPlaces.isPinned), asc(wishlistPlaces.sortOrder), asc(wishlistPlaces.name), asc(wishlistPlaces.createdAt));
    return places.map(mapPlace);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("no such column") || msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
      return [];
    }
    throw error;
  }
}

export async function getPublicWishlistPlaceBySlug(slug: string): Promise<PublicWishlistPlace | null> {
  try {
    const db = getDb();

    const [place] = await db
      .select(PLACE_SELECT)
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

    return mapPlace(place);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("no such column") || msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
      return null;
    }
    throw error;
  }
}

/**
 * Returns the child places of a multi-site wishlist item.
 * Children are fetched regardless of their own linkedPost status since
 * the parent controls visibility.
 */
export async function getPublicWishlistPlaceChildren(parentId: string): Promise<PublicWishlistPlace[]> {
  try {
    const db = getDb();

    const children = await db
      .select(PLACE_SELECT)
      .from(wishlistPlaces)
      .where(
        and(
          eq(wishlistPlaces.parentId, parentId),
          eq(wishlistPlaces.isPublic, true),
        ),
      )
      .orderBy(asc(wishlistPlaces.sortOrder), asc(wishlistPlaces.name), asc(wishlistPlaces.createdAt));

    return children.map(mapPlace);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("no such column") || msg.includes("no such table") || msg.includes("SQLITE_ERROR")) {
      return [];
    }
    throw error;
  }
}
