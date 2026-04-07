import { NextResponse } from "next/server";

import { requireCronAuthorization } from "@/lib/cron-auth";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { pingSupabaseKeepalive } from "@/server/supabase/keepalive";

// GET /api/cron/keep-supabase-awake
// Input: Authorization: Bearer {CRON_SECRET}
// Output: { ok: true; nowIso: string; service: "auth" }
// Auth: Vercel Cron secret — always required outside local development
// UI: none; operational endpoint for keeping Supabase warm

export async function GET(request: Request): Promise<NextResponse> {
  const rl = await checkRateLimit(`cron-keep-supabase-awake:${getClientIp(request)}`, 30, 60_000);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  const authError = requireCronAuthorization(request);
  if (authError) {
    return authError;
  }

  try {
    const result = await pingSupabaseKeepalive();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron] pingSupabaseKeepalive failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
