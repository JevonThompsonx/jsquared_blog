import type { NextRequest } from "next/server";

import { enforceAuthRateLimit, initiateWorkosAuth } from "@/lib/auth/workos";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = await enforceAuthRateLimit(
    request,
    "auth-signup",
    10,
    3_600_000,
  );
  if (limited) return limited;
  return initiateWorkosAuth(request, "sign-up");
}
