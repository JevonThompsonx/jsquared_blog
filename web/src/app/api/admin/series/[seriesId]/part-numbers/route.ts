import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/session";
import { getSeriesPartNumbers } from "@/server/dal/series";

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

  const { seriesId } = await params;
  const result = await getSeriesPartNumbers(seriesId);

  return NextResponse.json(result);
}
