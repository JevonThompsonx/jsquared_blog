import "server-only";

import type { User } from "@supabase/supabase-js";
import { and, eq } from "drizzle-orm";

import { authAccounts, profiles, users } from "@/drizzle/schema";
import { getDb } from "@/lib/db";

export type PublicAppUser = {
  id: string;
  supabaseUserId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

function now(): Date {
  return new Date();
}

function getSupabaseUserId(providerUserId: string): string {
  return `supabase-user-${providerUserId}`;
}

function getSupabaseAccountId(providerUserId: string): string {
  return `supabase-account-${providerUserId}`;
}

function fallbackEmail(user: User): string {
  return user.email ?? `${user.id}@users.supabase.local`;
}

function getDisplayName(user: User): string {
  const metadata = user.user_metadata;
  if (typeof metadata?.user_name === "string" && metadata.user_name.trim()) {
    return metadata.user_name.trim();
  }

  if (typeof metadata?.preferred_username === "string" && metadata.preferred_username.trim()) {
    return metadata.preferred_username.trim();
  }

  if (typeof metadata?.full_name === "string" && metadata.full_name.trim()) {
    return metadata.full_name.trim();
  }

  if (typeof metadata?.name === "string" && metadata.name.trim()) {
    return metadata.name.trim();
  }

  if (user.email) {
    return user.email.split("@")[0] ?? "Traveler";
  }

  return "Traveler";
}

function getAvatarUrl(user: User): string | null {
  const metadata = user.user_metadata;
  if (typeof metadata?.avatar_url === "string" && metadata.avatar_url.trim()) {
    return metadata.avatar_url.trim();
  }

  return null;
}

export async function getPublicAppUserBySupabaseId(providerUserId: string): Promise<PublicAppUser | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.primaryEmail,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      supabaseUserId: authAccounts.providerUserId,
    })
    .from(authAccounts)
    .innerJoin(users, eq(authAccounts.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(authAccounts.provider, "supabase"), eq(authAccounts.providerUserId, providerUserId)))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? "Traveler",
    avatarUrl: row.avatarUrl ?? null,
    supabaseUserId: row.supabaseUserId,
  };
}

export async function ensurePublicAppUser(user: User): Promise<PublicAppUser> {
  const existing = await getPublicAppUserBySupabaseId(user.id);
  if (existing) {
    return existing;
  }

  const db = getDb();
  const userId = getSupabaseUserId(user.id);
  const accountId = getSupabaseAccountId(user.id);
  const email = fallbackEmail(user);
  const displayName = getDisplayName(user);
  const avatarUrl = getAvatarUrl(user);
  const timestamp = now();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      primaryEmail: email,
      role: "reader",
      createdAt: timestamp,
      updatedAt: timestamp,
    }).onConflictDoUpdate({
      target: users.id,
      set: {
        primaryEmail: email,
        updatedAt: timestamp,
      },
    });

    await tx.insert(profiles).values({
      userId,
      displayName,
      avatarUrl,
      bio: null,
      themePreference: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }).onConflictDoUpdate({
      target: profiles.userId,
      set: {
        displayName,
        avatarUrl,
        updatedAt: timestamp,
      },
    });

    await tx.insert(authAccounts).values({
      id: accountId,
      userId,
      provider: "supabase",
      providerUserId: user.id,
      providerEmail: user.email ?? null,
      createdAt: timestamp,
    }).onConflictDoUpdate({
      target: authAccounts.id,
      set: {
        userId,
        providerEmail: user.email ?? null,
      },
    });
  });

  return {
    id: userId,
    supabaseUserId: user.id,
    email,
    displayName,
    avatarUrl,
  };
}
