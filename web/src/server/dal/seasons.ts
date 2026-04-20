import "server-only";

import { eq } from "drizzle-orm";

import { seasons } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type SeasonRecord = {
  id: string;
  seasonKey: string;
  displayName: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export async function listAllSeasons(): Promise<SeasonRecord[]> {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id: seasons.id,
        seasonKey: seasons.seasonKey,
        displayName: seasons.displayName,
        createdByUserId: seasons.createdByUserId,
        createdAt: seasons.createdAt,
        updatedAt: seasons.updatedAt,
      })
      .from(seasons);

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
    }));
  } catch (error) {
    console.error("[seasons dal] listAllSeasons failed", error);
    return [];
  }
}

export async function upsertSeason(
  id: string,
  seasonKey: string,
  displayName: string,
  createdByUserId: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db
    .insert(seasons)
    .values({
      id,
      seasonKey,
      displayName,
      createdByUserId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: seasons.seasonKey,
      set: {
        displayName,
        updatedAt: now,
      },
    });
}

export async function deleteSeasonByKey(seasonKey: string): Promise<void> {
  const db = getDb();
  await db.delete(seasons).where(eq(seasons.seasonKey, seasonKey));
}
