import "server-only";

import type { User } from "@workos-inc/node";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { authAccounts, profiles, users } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import type { PublicAppUser } from "@/server/auth/public-users";

type Database = ReturnType<typeof getDb>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type WorkosIdentityErrorCode =
  "unverified_email" | "invalid_email" | "legacy_email" | "identity_conflict";

export class WorkosIdentityError extends Error {
  constructor(readonly code: WorkosIdentityErrorCode) {
    super(`WorkOS identity could not be linked (${code})`);
    this.name = "WorkosIdentityError";
  }
}

const emailSchema = z.string().trim().toLowerCase().email();
const LEGACY_EMAIL_SUFFIX = "@legacy.supabase.local";

function fallbackDisplayName(email: string, name?: string | null): string {
  return name?.trim() || email.split("@")[0]?.trim() || "Traveler";
}

function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(message);
}

async function loadIdentity(
  tx: Transaction,
  userId: string,
): Promise<PublicAppUser | null> {
  const rows = await tx
    .select({
      id: users.id,
      email: users.primaryEmail,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? fallbackDisplayName(row.email),
    avatarUrl: row.avatarUrl ?? null,
  };
}

async function promoteIfAllowed(
  tx: Transaction,
  userId: string,
  email: string,
  allowedEmails: ReadonlySet<string>,
  enabled: boolean,
): Promise<void> {
  if (!enabled || !allowedEmails.has(email)) return;

  await tx
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(and(eq(users.id, userId), sql`${users.role} != 'admin'`));
}

async function ensureProfile(
  tx: Transaction,
  userId: string,
  email: string,
  name?: string | null,
): Promise<void> {
  const now = new Date();
  await tx
    .insert(profiles)
    .values({
      userId,
      displayName: fallbackDisplayName(email, name),
      avatarUrl: null,
      bio: null,
      themePreference: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

async function mapIdentity(
  user: User,
  email: string,
  allowedEmails: ReadonlySet<string>,
  promoteAllowedUser: boolean,
): Promise<PublicAppUser> {
  return getDb().transaction(async (tx) => {
    const existingLinks = await tx
      .select({ userId: authAccounts.userId })
      .from(authAccounts)
      .where(
        and(
          eq(authAccounts.provider, "workos"),
          eq(authAccounts.providerUserId, user.id),
        ),
      )
      .limit(1);

    if (existingLinks[0]) {
      const linked = await loadIdentity(tx, existingLinks[0].userId);
      if (!linked || linked.email.toLowerCase().endsWith(LEGACY_EMAIL_SUFFIX)) {
        throw new WorkosIdentityError("identity_conflict");
      }
      await promoteIfAllowed(
        tx,
        linked.id,
        email,
        allowedEmails,
        promoteAllowedUser,
      );
      return linked;
    }

    const emailOwners = await tx
      .select({ id: users.id, email: users.primaryEmail })
      .from(users)
      .where(sql`lower(${users.primaryEmail}) = ${email}`)
      .limit(1);
    const emailOwner = emailOwners[0];

    if (emailOwner?.email.toLowerCase().endsWith(LEGACY_EMAIL_SUFFIX)) {
      throw new WorkosIdentityError("legacy_email");
    }

    let userId = emailOwner?.id;
    if (userId) {
      const competingLinks = await tx
        .select({ id: authAccounts.id })
        .from(authAccounts)
        .where(
          and(
            eq(authAccounts.userId, userId),
            eq(authAccounts.provider, "workos"),
            sql`${authAccounts.providerUserId} != ${user.id}`,
          ),
        )
        .limit(1);
      if (competingLinks[0]) {
        throw new WorkosIdentityError("identity_conflict");
      }
      await ensureProfile(tx, userId, email, user.name);
    } else {
      userId = `workos-user-${user.id}`;
      const now = new Date();
      await tx.insert(users).values({
        id: userId,
        primaryEmail: email,
        name: user.name?.trim() ?? "",
        emailVerified: true,
        role:
          promoteAllowedUser && allowedEmails.has(email) ? "admin" : "reader",
        createdAt: now,
        updatedAt: now,
      });
      await ensureProfile(tx, userId, email, user.name);
    }

    await tx.insert(authAccounts).values({
      id: `workos-account-${user.id}`,
      userId,
      provider: "workos",
      providerUserId: user.id,
      providerEmail: email,
      createdAt: new Date(),
    });

    await promoteIfAllowed(
      tx,
      userId,
      email,
      allowedEmails,
      promoteAllowedUser,
    );
    const mapped = await loadIdentity(tx, userId);
    if (!mapped) {
      throw new WorkosIdentityError("identity_conflict");
    }
    return mapped;
  });
}

/**
 * Maps a verified WorkOS identity to the existing local users/profiles graph.
 * Unique-index conflicts are retried so concurrent first logins converge on one
 * local row without assigning an email to a second WorkOS subject.
 */
export async function resolveWorkosIdentity(
  user: User,
  options: {
    allowedEmails?: readonly string[];
    promoteAllowedUser?: boolean;
  } = {},
): Promise<PublicAppUser> {
  if (user.emailVerified !== true) {
    throw new WorkosIdentityError("unverified_email");
  }

  const parsedEmail = emailSchema.safeParse(user.email);
  if (!parsedEmail.success) {
    throw new WorkosIdentityError("invalid_email");
  }

  const email = parsedEmail.data;
  const allowedEmails = new Set(
    (options.allowedEmails ?? []).map((entry) => entry.trim().toLowerCase()),
  );
  const promoteAllowedUser = options.promoteAllowedUser ?? false;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await mapIdentity(user, email, allowedEmails, promoteAllowedUser);
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }

  throw new WorkosIdentityError("identity_conflict");
}
