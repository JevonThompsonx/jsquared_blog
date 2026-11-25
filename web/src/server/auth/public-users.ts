import "server-only";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";

import { profiles, users } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { parseAllowedEmails } from "@/lib/auth/workos";
import {
  resolveWorkosIdentity,
  WorkosIdentityError,
} from "@/server/auth/workos-identity";

export type PublicAppUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

function fallbackDisplayName(email: string): string {
  return email.split("@")[0]?.trim() || "Traveler";
}

export async function getPublicAppUserById(
  userId: string,
): Promise<PublicAppUser | null> {
  const rows = await getDb()
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

/** Resolve the reader from the sole AuthKit session cookie. */
export async function getRequestPublicUser(
  _request: Request,
): Promise<PublicAppUser | null> {
  const { user } = await withAuth();
  if (!user || user.emailVerified !== true) {
    return null;
  }

  try {
    return await resolveWorkosIdentity(user, {
      allowedEmails: parseAllowedEmails(getServerEnv().ADMIN_ALLOWED_EMAILS),
      promoteAllowedUser: false,
    });
  } catch (error) {
    if (error instanceof WorkosIdentityError) {
      return null;
    }
    throw error;
  }
}
