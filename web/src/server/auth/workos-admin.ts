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

export type AdminViewer = {
  id: string;
  email: string;
  name: string | null;
};

export type AdminAccessState = {
  session: AdminSession | null;
  stale: boolean;
  viewer: AdminViewer | null;
};

/**
 * WorkOS is the only admin identity source. Cloudflare Access does not gate
 * /admin, and its JWT is never accepted as an application admin session.
 */
export async function getWorkosAdminAccessState(): Promise<AdminAccessState> {
  let viewer: AdminViewer | null = null;
  try {
    const { user, impersonator } = await withAuth();
    const parsedEmail =
      user && !impersonator ? emailSchema.safeParse(user.email) : null;
    if (user && !impersonator && parsedEmail?.success) {
      viewer = {
        id: user.id,
        email: parsedEmail.data,
        name: user.name?.trim() || null,
      };
    }

    if (!user || user.emailVerified !== true || !parsedEmail?.success) {
      return { session: null, stale: false, viewer };
    }

    const email = parsedEmail.data;
    const allowedEmails = parseAllowedEmails(
      getServerEnv().ADMIN_ALLOWED_EMAILS,
    );
    if (!allowedEmails.includes(email)) {
      return { session: null, stale: false, viewer };
    }

    const mapped = await resolveWorkosIdentity(user, {
      allowedEmails,
      promoteAllowedUser: false,
    });
    const localUsers = await getDb()
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, mapped.id))
      .limit(1);
    if (localUsers[0]?.role !== "admin") {
      return { session: null, stale: false, viewer };
    }

    const { isStale } = await checkRecentAuth({ maxAge: 86_400 });
    if (isStale) return { session: null, stale: true, viewer };

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
      viewer,
    };
  } catch {
    // Identity, database, and session-verification failures all deny admin access.
    return { session: null, stale: false, viewer };
  }
}

export async function getWorkosAdminSession(): Promise<AdminSession | null> {
  return (await getWorkosAdminAccessState()).session;
}
