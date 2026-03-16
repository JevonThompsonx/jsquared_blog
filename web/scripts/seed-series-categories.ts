/**
 * Seed test series and categories for admin editor development.
 * Run: bun run ./scripts/seed-series-categories.ts
 */

import { getDb } from "../src/lib/db-core";
import { loadEnvironmentFiles } from "../src/lib/env-loader";
import { categories, series } from "../src/drizzle/schema";

loadEnvironmentFiles();

const TEST_SERIES = [
  { id: "series-pacific-crest-trail", title: "Pacific Crest Trail", slug: "pacific-crest-trail", description: "Thru-hiking the PCT from Mexico to Canada" },
  { id: "series-van-life-chronicles", title: "Van Life Chronicles", slug: "van-life-chronicles", description: "Full-time living and traveling in a converted sprinter van" },
  { id: "series-national-parks-tour", title: "National Parks Tour", slug: "national-parks-tour", description: "Working our way through every US national park" },
  { id: "series-patagonia-expedition", title: "Patagonia Expedition", slug: "patagonia-expedition", description: "Three months exploring Chile and Argentina" },
  { id: "series-europe-by-rail", title: "Europe by Rail", slug: "europe-by-rail", description: "Inter-railing across 12 countries in 60 days" },
];

const TEST_CATEGORIES = [
  { id: "category-hiking", name: "Hiking", slug: "hiking", description: "Trails, peaks, and long-distance routes" },
  { id: "category-van-life", name: "Van Life", slug: "van-life", description: "Life on the road in our converted camper" },
  { id: "category-international", name: "International", slug: "international", description: "Adventures beyond North America" },
  { id: "category-gear", name: "Gear", slug: "gear", description: "Kit reviews, packing lists, and what we carry" },
  { id: "category-camping", name: "Camping", slug: "camping", description: "Dispersed camping, boondocking, and established sites" },
  { id: "category-road-trips", name: "Road Trips", slug: "road-trips", description: "Long drives, scenic byways, and cross-country routes" },
];

async function main() {
  const db = getDb();
  const now = new Date();

  console.log("Seeding series…");
  for (const s of TEST_SERIES) {
    await db
      .insert(series)
      .values({ ...s, createdAt: now })
      .onConflictDoNothing();
    console.log(`  ✓ ${s.title}`);
  }

  console.log("Seeding categories…");
  for (const c of TEST_CATEGORIES) {
    await db
      .insert(categories)
      .values(c)
      .onConflictDoNothing();
    console.log(`  ✓ ${c.name}`);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
