import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { requireAdminSession } from "@/lib/auth/session";
import { getSeriesPartNumbers } from "@/server/dal/series";

const seriesIdSchema = z.string().trim().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);

// GET /api/admin/series/:seriesId/part-numbers
// Output: { takenNumbers: number[]; next: number }
// Auth: Admin (Auth.js GitHub)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ seriesId: string }> },
): Promise<NextResponse> {
  const session = await requireAdminSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(`admin-series-part-numbers:${session.user.id}:${getClientIp(request)}`, 120, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const raw = await params;
  const parsedSeriesId = seriesIdSchema.safeParse(raw.seriesId);
  if (!parsedSeriesId.success) {
    return NextResponse.json({ error: "Invalid series id" }, { status: 400 });
  }

  try {
    const result = await getSeriesPartNumbers(parsedSeriesId.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin series part numbers] failed to load series part numbers", {
      seriesId: parsedSeriesId.data,
      error,
    });
    return NextResponse.json({ error: "Failed to load series part numbers" }, { status: 500 });
  }
}
