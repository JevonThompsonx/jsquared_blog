import "server-only";

import {
  getWorkosAdminAccessState,
  getWorkosAdminSession,
  type AdminAccessState,
  type AdminSession,
} from "@/server/auth/workos-admin";

export type { AdminAccessState, AdminSession };

export async function getAdminAccessState(): Promise<AdminAccessState> {
  return getWorkosAdminAccessState();
}

export async function getAdminServerSession(): Promise<AdminSession | null> {
  return getWorkosAdminSession();
}

export async function requireAdminSession(): Promise<AdminSession | null> {
  const session = await getAdminServerSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return null;
  }

  return session;
}
