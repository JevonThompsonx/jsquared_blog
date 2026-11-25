import "server-only";

import { checkRecentAuth, withAuth } from "@workos-inc/authkit-nextjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { users } from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { parseAllowedEmails } from "@/lib/auth/workos";
import { resolveWorkosIdentity } from "@/server/auth/workos-identity";

export type AdminSession = {
  user?: {
    id?: string;
    role?: "reader" | "author" | "admin";
    email?: string | null;
    name?: string | null;
  };
  expires: string;
};

const emailSchema = z.string().trim().toLowerCase().email();

export type AdminAccessState = {
  session: AdminSession | null;
  stale: boolean;
};

/**
 * WorkOS is the only admin identity source. Cloudflare Access remains an outer
 * edge gate, but its JWT is never accepted as an application admin session.
 */
export async function getWorkosAdminAccessState(): Promise<AdminAccessState> {
  try {
    const { user, impersonator } = await withAuth();
    if (!user || user.emailVerified !== true || impersonator) {
      return { session: null, stale: false };
    }

    const parsedEmail = emailSchema.safeParse(user.email);
    if (!parsedEmail.success) return { session: null, stale: false };

    const email = parsedEmail.data;
    const allowedEmails = parseAllowedEmails(
      getServerEnv().ADMIN_ALLOWED_EMAILS,
    );
    if (!allowedEmails.includes(email)) return { session: null, stale: false };

    const mapped = await resolveWorkosIdentity(user, {
      allowedEmails,
      promoteAllowedUser: false,
    });
    const localUsers = await getDb()
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, mapped.id))
      .limit(1);
    if (localUsers[0]?.role !== "admin") return { session: null, stale: false };

    const { isStale } = await checkRecentAuth({ maxAge: 86_400 });
    if (isStale) return { session: null, stale: true };

    return {
      session: {
        user: {
          id: mapped.id,
          role: "admin",
          email,
          name: user.name?.trim() || mapped.displayName,
        },
        expires: new Date(Date.now() + 86_400_000).toISOString(),
      },
      stale: false,
    };
  } catch {
    // Identity, database, and session-verification failures all deny admin access.
    return { session: null, stale: false };
  }
}

export async function getWorkosAdminSession(): Promise<AdminSession | null> {
  return (await getWorkosAdminAccessState()).session;
}
