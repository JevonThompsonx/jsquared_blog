import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { isDeployedEnvironment } from "@/lib/env";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { pingSupabaseKeepalive } from "@/server/supabase/keepalive";

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

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

  const cronSecret = process.env.CRON_SECRET;
  const requestUrl = new URL(request.url);
  const isLoopbackRequest = ["localhost", "127.0.0.1", "::1"].includes(requestUrl.hostname);
  const canBypassCronSecret = !isDeployedEnvironment(process.env) && isLoopbackRequest;

  if (!cronSecret) {
    if (!canBypassCronSecret) {
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  } else {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token || !secureEquals(token, cronSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await pingSupabaseKeepalive();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron] pingSupabaseKeepalive failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
