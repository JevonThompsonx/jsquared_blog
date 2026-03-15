/**
 * Seed location data onto existing published posts for map testing.
 * Run: bun run ./scripts/seed-locations.ts
 */

import { eq } from "drizzle-orm";

import { getDb } from "../src/lib/db-core";
import { loadEnvironmentFiles } from "../src/lib/env-loader";
import { posts } from "../src/drizzle/schema";

loadEnvironmentFiles();

const LOCATIONS = [
  { locationName: "Crater Lake, Oregon", locationLat: 42.9446, locationLng: -122.109, locationZoom: 11 },
  { locationName: "Olympic National Park, Washington", locationLat: 47.8021, locationLng: -123.6044, locationZoom: 9 },
  { locationName: "Banff National Park, Alberta", locationLat: 51.4968, locationLng: -115.9281, locationZoom: 10 },
  { locationName: "Moab, Utah", locationLat: 38.5733, locationLng: -109.5498, locationZoom: 11 },
  { locationName: "Yosemite National Park, California", locationLat: 37.8651, locationLng: -119.5383, locationZoom: 10 },
  { locationName: "Glacier National Park, Montana", locationLat: 48.7596, locationLng: -113.787, locationZoom: 9 },
  { locationName: "Zion National Park, Utah", locationLat: 37.2982, locationLng: -113.0263, locationZoom: 11 },
  { locationName: "Portland, Oregon", locationLat: 45.5051, locationLng: -122.675, locationZoom: 11 },
  { locationName: "Patagonia, Argentina", locationLat: -41.1335, locationLng: -71.3103, locationZoom: 7 },
  { locationName: "Dolomites, Italy", locationLat: 46.4102, locationLng: 11.8440, locationZoom: 9 },
  { locationName: "Torres del Paine, Chile", locationLat: -51.0, locationLng: -73.0, locationZoom: 9 },
  { locationName: "Scottish Highlands", locationLat: 57.1, locationLng: -4.7, locationZoom: 8 },
];

async function main() {
  const db = getDb();

  const allPosts = await db
    .select({ id: posts.id, title: posts.title, status: posts.status })
    .from(posts)
    .orderBy(posts.createdAt);

  if (allPosts.length === 0) {
    console.log("No posts found in database. Create some posts first via the admin UI.");
    return;
  }

  console.log(`Found ${allPosts.length} post(s). Assigning locations...`);

  for (let i = 0; i < allPosts.length; i++) {
    const post = allPosts[i];
    const location = LOCATIONS[i % LOCATIONS.length];

    await db
      .update(posts)
      .set({
        locationName: location.locationName,
        locationLat: location.locationLat,
        locationLng: location.locationLng,
        locationZoom: location.locationZoom,
        iovanderUrl: null,
      })
      .where(eq(posts.id, post.id));

    console.log(`  ✓ "${post.title}" → ${location.locationName}`);
  }

  console.log("\nDone! Reload the /map page to see all pins.");
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
