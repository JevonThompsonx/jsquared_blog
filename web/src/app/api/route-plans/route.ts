import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

const ROUTE_PLANNER_RETIRED_RESPONSE = {
  error: "Route planner retired",
  redirectTo: "/wishlist",
} as const;

export async function POST(request: Request): Promise<NextResponse> {
  const rl = await checkRateLimit(`route-plans:${getClientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.allowed) {
    return tooManyRequests(rl);
  }

  return NextResponse.json(ROUTE_PLANNER_RETIRED_RESPONSE, { status: 410 });
}
