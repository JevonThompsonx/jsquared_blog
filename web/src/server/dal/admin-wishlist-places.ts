import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { wishlistPlaces } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type AdminWishlistPlaceRecord = {
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
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAdminWishlistPlaceInput = {
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  zoom: number;
  sortOrder: number;
  visited: boolean;
  isPublic: boolean;
  externalUrl: string | null;
  createdByUserId: string;
};

export type UpdateAdminWishlistPlaceInput = {
  id: string;
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  zoom: number;
  sortOrder: number;
  visited: boolean;
  isPublic: boolean;
  externalUrl: string | null;
};

export async function createAdminWishlistPlace(input: CreateAdminWishlistPlaceInput): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db.insert(wishlistPlaces).values({
    id: crypto.randomUUID(),
    name: input.name,
    locationName: input.locationName,
    locationLat: input.latitude,
    locationLng: input.longitude,
    locationZoom: input.zoom,
    sortOrder: input.sortOrder,
    visited: input.visited,
    isPublic: input.isPublic,
    externalUrl: input.externalUrl,
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
      locationLat: input.latitude,
      locationLng: input.longitude,
      locationZoom: input.zoom,
      sortOrder: input.sortOrder,
      visited: input.visited,
      isPublic: input.isPublic,
      externalUrl: input.externalUrl,
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
      locationLat: wishlistPlaces.locationLat,
      locationLng: wishlistPlaces.locationLng,
      locationZoom: wishlistPlaces.locationZoom,
      sortOrder: wishlistPlaces.sortOrder,
      visited: wishlistPlaces.visited,
      isPublic: wishlistPlaces.isPublic,
      externalUrl: wishlistPlaces.externalUrl,
      createdAt: wishlistPlaces.createdAt,
      updatedAt: wishlistPlaces.updatedAt,
    })
    .from(wishlistPlaces)
    .orderBy(asc(wishlistPlaces.sortOrder), asc(wishlistPlaces.name), desc(wishlistPlaces.createdAt));
}
