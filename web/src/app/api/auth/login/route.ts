import type { NextRequest } from "next/server";

import {
  enforceAuthRateLimit,
  initiateWorkosAuth,
  parseAuthMaxAge,
} from "@/lib/auth/workos";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = await enforceAuthRateLimit(
    request,
    "auth-login",
    20,
    300_000,
  );
  if (limited) return limited;
  const maxAge = parseAuthMaxAge(request.nextUrl.searchParams.get("maxAge"));
  return initiateWorkosAuth(request, "sign-in", { maxAge });
}
