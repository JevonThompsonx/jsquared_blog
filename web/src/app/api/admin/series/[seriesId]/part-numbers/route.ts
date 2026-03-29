import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/auth/session";
import { getSeriesPartNumbers } from "@/server/dal/series";

const seriesIdSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);

// GET /api/admin/series/:seriesId/part-numbers
// Output: { takenNumbers: number[]; next: number }
// Auth: Admin (Auth.js GitHub)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seriesId: string }> },
): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await params;
  const parsedSeriesId = seriesIdSchema.safeParse(raw.seriesId);
  if (!parsedSeriesId.success) {
    return NextResponse.json({ error: "Invalid series id" }, { status: 400 });
  }

  const result = await getSeriesPartNumbers(parsedSeriesId.data);

  return NextResponse.json(result);
}
