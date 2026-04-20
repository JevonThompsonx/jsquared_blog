import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";

import { wishlistPlaces } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type AdminWishlistPlaceRecord = {
  id: string;
  name: string;
  locationName: string;
  description: string | null;
  locationLat: number;
  locationLng: number;
  locationZoom: number;
  sortOrder: number;
  visited: boolean;
  isPublic: boolean;
  isPinned: boolean;
  externalUrl: string | null;
  visitedYear: number | null;
  imageUrl: string | null;
  detailSlug: string | null;
  linkedPostId: string | null;
  itemType: "single" | "multi";
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAdminWishlistPlaceInput = {
  name: string;
  locationName: string;
  description: string | null;
  latitude: number;
  longitude: number;
  zoom: number;
  sortOrder: number;
  visited: boolean;
  isPublic: boolean;
  isPinned: boolean;
  externalUrl: string | null;
  visitedYear: number | null;
  imageUrl: string | null;
  detailSlug: string | null;
  itemType: "single" | "multi";
  parentId: string | null;
  createdByUserId: string;
};

export type UpdateAdminWishlistPlaceInput = {
  id: string;
  name: string;
  locationName: string;
  description: string | null;
  latitude: number;
  longitude: number;
  zoom: number;
  sortOrder: number;
  visited: boolean;
  isPublic: boolean;
  isPinned: boolean;
  externalUrl: string | null;
  visitedYear: number | null;
  imageUrl: string | null;
  detailSlug: string | null;
  itemType: "single" | "multi";
  parentId: string | null;
};

export async function createAdminWishlistPlace(input: CreateAdminWishlistPlaceInput): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db.insert(wishlistPlaces).values({
    id: crypto.randomUUID(),
    name: input.name,
    locationName: input.locationName,
    description: input.description,
    locationLat: input.latitude,
    locationLng: input.longitude,
    locationZoom: input.zoom,
    sortOrder: input.sortOrder,
    visited: input.visited,
    isPublic: input.isPublic,
    isPinned: input.isPinned,
    externalUrl: input.externalUrl,
    visitedYear: input.visitedYear,
    imageUrl: input.imageUrl,
    detailSlug: input.detailSlug,
    itemType: input.itemType,
    parentId: input.parentId,
    createdByUserId: input.createdByUserId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateAdminWishlistPlace(input: UpdateAdminWishlistPlaceInput): Promise<void> {
  const db = getDb();

  await db
    .update(wishlistPlaces)
    .set({
      name: input.name,
      locationName: input.locationName,
      description: input.description,
      locationLat: input.latitude,
      locationLng: input.longitude,
      locationZoom: input.zoom,
      sortOrder: input.sortOrder,
      visited: input.visited,
      isPublic: input.isPublic,
      isPinned: input.isPinned,
      externalUrl: input.externalUrl,
      visitedYear: input.visitedYear,
      imageUrl: input.imageUrl,
      detailSlug: input.detailSlug,
      itemType: input.itemType,
      parentId: input.parentId,
      updatedAt: new Date(),
    })
    .where(eq(wishlistPlaces.id, input.id));
}

export async function deleteAdminWishlistPlace(id: string): Promise<void> {
  const db = getDb();

  await db.delete(wishlistPlaces).where(eq(wishlistPlaces.id, id));
}

export async function listAdminWishlistPlaces(): Promise<AdminWishlistPlaceRecord[]> {
  const db = getDb();

  try {
    return await db
      .select({
        id: wishlistPlaces.id,
        name: wishlistPlaces.name,
        locationName: wishlistPlaces.locationName,
        description: wishlistPlaces.description,
        locationLat: wishlistPlaces.locationLat,
        locationLng: wishlistPlaces.locationLng,
        locationZoom: wishlistPlaces.locationZoom,
        sortOrder: wishlistPlaces.sortOrder,
        visited: wishlistPlaces.visited,
        isPublic: wishlistPlaces.isPublic,
        isPinned: wishlistPlaces.isPinned,
        externalUrl: wishlistPlaces.externalUrl,
        visitedYear: wishlistPlaces.visitedYear,
        imageUrl: wishlistPlaces.imageUrl,
        detailSlug: wishlistPlaces.detailSlug,
        linkedPostId: wishlistPlaces.linkedPostId,
        itemType: wishlistPlaces.itemType,
        parentId: wishlistPlaces.parentId,
        createdAt: wishlistPlaces.createdAt,
        updatedAt: wishlistPlaces.updatedAt,
      })
      .from(wishlistPlaces)
      .orderBy(asc(wishlistPlaces.sortOrder), asc(wishlistPlaces.name), desc(wishlistPlaces.createdAt));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const causeMsg = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
    if (
      msg.includes("no such column") ||
      msg.includes("no such table") ||
      msg.includes("SQLITE_ERROR") ||
      causeMsg.includes("no such column") ||
      causeMsg.includes("no such table")
    ) {
      // Migration not yet applied — return empty list rather than crashing the admin page.
      return [];
    }
    throw error;
  }
}

export async function setWishlistPlaceLinkedPost(id: string, postId: string | null): Promise<void> {
  const db = getDb();

  await db
    .update(wishlistPlaces)
    .set({ linkedPostId: postId, updatedAt: new Date() })
    .where(eq(wishlistPlaces.id, id));
}

export async function deactivateLinkedWishlistPlaces(postIds: string[]): Promise<void> {
  if (postIds.length === 0) return;

  const db = getDb();

  await db
    .update(wishlistPlaces)
    .set({ isPublic: false, updatedAt: new Date() })
    .where(inArray(wishlistPlaces.linkedPostId, postIds));
}
