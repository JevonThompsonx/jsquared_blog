import "server-only";

import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";

import { buildAdminAuthOptions } from "@/lib/auth/admin";
import { getAccessIdentity } from "@/lib/auth/cloudflare-access";
import { ensureAccessAdminUser } from "@/server/auth/access-users";

export type AdminSession = Session;

function buildAccessSession(user: {
  id: string;
  email: string;
  role: "admin";
}): AdminSession {
  return {
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      name: user.email,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as AdminSession;
}

/**
 * Resolve the admin identity for this request.
 *
 * Cloudflare Access is the primary method: `/admin` and `/api/admin` are behind
 * an Access application, and a verified `Cf-Access-Jwt-Assertion` is enough to
 * treat the caller as an admin. GitHub OAuth remains as a fallback so the setup
 * keeps working for hosts that are not behind Access (e.g. the preview Worker).
 */
export async function getAdminServerSession(): Promise<AdminSession | null> {
  const requestHeaders = await headers();
  const access = await getAccessIdentity(requestHeaders);

  if (access) {
    const user = await ensureAccessAdminUser(access.email);
    return buildAccessSession(user);
  }

  return getServerSession(buildAdminAuthOptions());
}

export async function requireAdminSession(): Promise<AdminSession | null> {
  const session = await getAdminServerSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return null;
  }

  return session;
}
