import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

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
 * requests. The secret is always enforced unless NODE_ENV === "development" (local dev
 * where the secret is typically absent). Any other environment — including Vercel Preview
 * deployments — must supply the secret or receives 401.
 *
 * Schedule: every 5 minutes (cron: "0/5 * * * *") — configured in vercel.json.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isLocalDev = process.env.NODE_ENV === "development";

  if (!cronSecret) {
    if (!isLocalDev) {
      // Fail closed: no secret set outside local dev means the endpoint is
      // misconfigured — refuse rather than running unauthenticated.
      return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
    }
    // Local dev without a secret: allow through so developers can test locally.
  } else {
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
