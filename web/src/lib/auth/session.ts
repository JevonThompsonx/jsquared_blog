import "server-only";

import type { Session } from "next-auth";
import { getServerSession } from "next-auth";

import { buildAdminAuthOptions } from "@/lib/auth/admin";

export type AdminSession = Session;

export async function getAdminServerSession(): Promise<AdminSession | null> {
  return getServerSession(buildAdminAuthOptions());
}

export async function requireAdminSession(): Promise<AdminSession | null> {
  const session = await getAdminServerSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return null;
  }

  return session;
}
