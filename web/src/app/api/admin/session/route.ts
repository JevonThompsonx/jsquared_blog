import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  const user = session?.user;
  const safeSession =
    user?.id && user.role === "admin"
      ? {
          user: {
            id: user.id,
            role: "admin" as const,
            email: user.email ?? null,
            name: user.name ?? user.email ?? "Admin",
          },
        }
      : null;

  return NextResponse.json(
    { session: safeSession },
    { headers: { "Cache-Control": "no-store, private, max-age=0" } },
  );
}
