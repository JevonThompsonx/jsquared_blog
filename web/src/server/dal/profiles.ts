import "server-only";

import { eq } from "drizzle-orm";

import { profiles, users } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type ProfileRecord = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  themePreference: string | null;
};

type ProfileUpdateFields = {
  displayName?: string;
  avatarUrl?: string | null;
  themePreference?: string | null;
};

export async function getProfileByUserId(userId: string): Promise<ProfileRecord | null> {
  const db = getDb();
  const rows = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      themePreference: profiles.themePreference,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export type PublicAuthorProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  memberSince: Date;
};

export async function getPublicAuthorProfileById(userId: string): Promise<PublicAuthorProfile | null> {
  const db = getDb();
  const rows = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      bio: profiles.bio,
      memberSince: users.createdAt,
    })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(eq(profiles.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

export async function updateProfileFields(userId: string, fields: ProfileUpdateFields): Promise<void> {
  const db = getDb();
  await db
    .update(profiles)
    .set({
      ...(fields.displayName !== undefined && { displayName: fields.displayName }),
      ...("avatarUrl" in fields && { avatarUrl: fields.avatarUrl ?? null }),
      ...("themePreference" in fields && { themePreference: fields.themePreference ?? null }),
      updatedAt: new Date(),
    })
    .where(eq(profiles.userId, userId));
}
