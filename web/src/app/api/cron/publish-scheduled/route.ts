import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { publishDueScheduledPosts } from "@/server/posts/publish";

// GET /api/cron/publish-scheduled
// Input: Authorization: Bearer {CRON_SECRET} when configured
// Output: { scanned: number; published: number; ids: string[]; nowIso: string; timezone: "UTC" }
// Auth: Vercel Cron secret
// UI: none; operational endpoint for scheduled publishing

/**
 * Vercel Cron: publish any scheduled posts whose scheduledPublishTime has passed.
 *
 * Security: Vercel automatically adds `Authorization: Bearer {CRON_SECRET}` to cron
 * requests. When CRON_SECRET is set we enforce it; in local dev it is typically absent
 * so the check is skipped.
 *
 * Schedule: every 5 minutes (cron: "0/5 * * * *") — configured in vercel.json.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isProductionRuntime = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

  if (!cronSecret && isProductionRuntime) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let result;
  try {
    result = await publishDueScheduledPosts();
  } catch (err) {
    console.error("[cron] publishDueScheduledPosts failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return NextResponse.json({
    scanned: result.scannedCount,
    published: result.publishedCount,
    ids: result.updatedPostIds,
    nowIso: result.nowIso,
    timezone: "UTC",
  });
}
