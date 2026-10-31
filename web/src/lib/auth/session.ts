import "server-only";

import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";

import { buildAdminAuthOptions } from "@/lib/auth/admin";
import {
  getAccessIdentity,
  isAccessConfigured,
} from "@/lib/auth/cloudflare-access";
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
 * Cloudflare Access is authoritative whenever it is configured: `/admin` and
 * `/api/admin` are behind the Access application, and a verified
 * `Cf-Access-Jwt-Assertion` whose email is on the allowlist is enough to act as
 * an admin. There is deliberately **no** GitHub fallback in that mode — a caller
 * who reaches the Worker without a valid Access JWT (for example through the
 * `*.workers.dev` hostname) is not an admin.
 *
 * GitHub OAuth is used only when Access is not configured (local development).
 */
export async function getAdminServerSession(): Promise<AdminSession | null> {
  const requestHeaders = await headers();
  const access = await getAccessIdentity(requestHeaders);

  if (access) {
    const user = await ensureAccessAdminUser(access.email);
    return buildAccessSession(user);
  }

  if (isAccessConfigured()) {
    return null;
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

/** True when admin identity comes from Cloudflare Access rather than GitHub. */
export function isAdminAuthViaAccess(): boolean {
  return isAccessConfigured();
}
