import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { getEnvSource } from "@/lib/env";

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isLoopbackHost(hostname: string): boolean {
  const normalizedHostname = hostname.replace(/^\[(.*)\]$/, "$1");

  return ["localhost", "127.0.0.1", "::1"].includes(normalizedHostname);
}

export function requireCronAuthorization(
  request: Request,
  env: NodeJS.ProcessEnv = getEnvSource(),
): NextResponse | null {
  const cronSecret = env.CRON_SECRET;
  const isLocalDevelopment = env.NODE_ENV === "development";
  const requestUrl = new URL(request.url);

  if (!cronSecret) {
    if (!isLocalDevelopment || !isLoopbackHost(requestUrl.hostname)) {
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }

    return null;
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !secureEquals(token, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
