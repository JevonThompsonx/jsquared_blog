/**
 * Seed stable wishlist destinations for local/admin testing.
 * Run: bun run seed:wishlist
 */

import { profiles, users, wishlistPlaces } from "../src/drizzle/schema";
import { loadEnvironmentFiles } from "../src/lib/env-loader";
import { getDb } from "../src/lib/db-core";
import { createWishlistSeedRecords } from "../src/lib/wishlist/seed-data";

loadEnvironmentFiles();

const WISHLIST_SEED_ADMIN_ID = "wishlist-seed-admin";
const WISHLIST_SEED_ADMIN_EMAIL = "wishlist-admin@jsquaredadventures.test";

async function ensureWishlistSeedAdmin(): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db
    .insert(users)
    .values({
      id: WISHLIST_SEED_ADMIN_ID,
      primaryEmail: WISHLIST_SEED_ADMIN_EMAIL,
      role: "admin",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        primaryEmail: WISHLIST_SEED_ADMIN_EMAIL,
        role: "admin",
        updatedAt: now,
      },
    });

  await db
    .insert(profiles)
    .values({
      userId: WISHLIST_SEED_ADMIN_ID,
      displayName: "Wishlist Seed Admin",
      avatarUrl: null,
      bio: "Stable local admin used to seed wishlist test data.",
      themePreference: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName: "Wishlist Seed Admin",
        avatarUrl: null,
        bio: "Stable local admin used to seed wishlist test data.",
        updatedAt: now,
      },
    });
}

async function seedWishlistPlaces(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const seedRecords = createWishlistSeedRecords(WISHLIST_SEED_ADMIN_ID, now);

  for (const record of seedRecords) {
    await db
      .insert(wishlistPlaces)
      .values(record)
      .onConflictDoUpdate({
        target: wishlistPlaces.id,
        set: {
          name: record.name,
          locationName: record.locationName,
          locationLat: record.locationLat,
          locationLng: record.locationLng,
          locationZoom: record.locationZoom,
          sortOrder: record.sortOrder,
          visited: record.visited,
          isPublic: record.isPublic,
          externalUrl: record.externalUrl,
          createdByUserId: record.createdByUserId,
          updatedAt: now,
        },
      });
  }

  console.log(`Seeded ${seedRecords.length} wishlist destination(s).`);
  console.log("Public wishlist: /wishlist");
  console.log("Admin wishlist: /admin/wishlist");
}

async function main(): Promise<void> {
  await ensureWishlistSeedAdmin();
  await seedWishlistPlaces();
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Failed to seed wishlist destinations: ${message}`);
  process.exit(1);
});
