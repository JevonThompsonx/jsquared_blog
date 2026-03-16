import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { posts } from "@/drizzle/schema";
import { requireAdminSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seriesId: string }> },
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { seriesId } = await params;
  const db = getDb();

  const rows = await db
    .select({ seriesOrder: posts.seriesOrder })
    .from(posts)
    .where(eq(posts.seriesId, seriesId));

  const takenNumbers = rows
    .map((r) => r.seriesOrder)
    .filter((n): n is number => typeof n === "number");

  const next = takenNumbers.length === 0 ? 1 : Math.max(...takenNumbers) + 1;

  return NextResponse.json({ takenNumbers, next });
}
