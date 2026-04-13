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
  externalUrl: string | null;
  visitedYear: number | null;
  imageUrl: string | null;
  linkedPostId: string | null;
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
  externalUrl: string | null;
  visitedYear: number | null;
  imageUrl: string | null;
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
  externalUrl: string | null;
  visitedYear: number | null;
  imageUrl: string | null;
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
    externalUrl: input.externalUrl,
    visitedYear: input.visitedYear,
    imageUrl: input.imageUrl,
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
      externalUrl: input.externalUrl,
      visitedYear: input.visitedYear,
      imageUrl: input.imageUrl,
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

  return db
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
      externalUrl: wishlistPlaces.externalUrl,
      visitedYear: wishlistPlaces.visitedYear,
      imageUrl: wishlistPlaces.imageUrl,
      linkedPostId: wishlistPlaces.linkedPostId,
      createdAt: wishlistPlaces.createdAt,
      updatedAt: wishlistPlaces.updatedAt,
    })
    .from(wishlistPlaces)
    .orderBy(asc(wishlistPlaces.sortOrder), asc(wishlistPlaces.name), desc(wishlistPlaces.createdAt));
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
