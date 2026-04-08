import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireCronAuthorization } from "@/lib/cron-auth";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { publishDueScheduledPosts } from "@/server/posts/publish";

// GET /api/cron/publish-scheduled
// Input: Authorization: Bearer {CRON_SECRET}
// Output: { scanned: number; published: number; ids: string[]; nowIso: string; timezone: "UTC" }
// Auth: Vercel Cron secret — always required outside local development
// UI: none; operational endpoint for scheduled publishing

/**
 * Vercel Cron: publish any scheduled posts whose scheduledPublishTime has passed.
 *
 * Security: Vercel automatically adds `Authorization: Bearer {CRON_SECRET}` to cron
 * requests. The secret is always enforced unless this is a loopback request in local
 * development where the secret is typically absent. Any other environment must supply
 * the secret or the route fails closed.
 *
 * Schedule: daily at midnight UTC (cron: "0 0 * * *") — configured in vercel.json.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const authError = requireCronAuthorization(request);
  if (authError) {
    return authError;
  }

  const rl = await checkRateLimit(`cron-publish-scheduled:${getClientIp(request)}`, 30, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  let result;
  try {
    result = await publishDueScheduledPosts();
  } catch (err) {
    console.error("[cron] publishDueScheduledPosts failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  try {
    revalidatePath("/");
  } catch (error) {
    console.error("[cron] publish-scheduled revalidation failed for /:", error);
  }

  try {
    revalidatePath("/admin");
  } catch (error) {
    console.error("[cron] publish-scheduled revalidation failed for /admin:", error);
  }

  return NextResponse.json({
    scanned: result.scannedCount,
    published: result.publishedCount,
    ids: result.updatedPostIds,
    nowIso: result.nowIso,
    timezone: "UTC",
  });
}
