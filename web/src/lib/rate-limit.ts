/**
 * In-process sliding-window rate limiter.
 *
 * Works within a single serverless instance. Vercel may run multiple warm instances
 * simultaneously, so this is a best-effort defence against naive burst abuse rather
 * than a globally-consistent rate limit. For distributed rate limiting, swap the store
 * for Upstash Redis + @upstash/ratelimit.
 */

import { NextResponse } from "next/server";

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
let sweepCounter = 0;

function sweep(now: number): void {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Returns the client IP from standard proxy headers injected by Vercel.
 * Falls back to "unknown" if no header is present (e.g. localhost).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // unix ms
};

/**
 * Check and update the rate limit for `key` (e.g. `"comment:<ip>"`).
 *
 * @param key     Unique identifier for this bucket (route + IP or route + userId)
 * @param limit   Maximum allowed calls per window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

  // Sweep expired entries every 100 calls to prevent unbounded memory growth
  sweepCounter++;
  if (sweepCounter >= 100) {
    sweepCounter = 0;
    sweep(now);
  }

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, limit, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Returns a 429 NextResponse with standard rate-limit headers.
 */
export function tooManyRequests(result: RateLimitResult): NextResponse {
  const retryAfterSecs = Math.ceil((result.resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        "Retry-After": String(retryAfterSecs),
      },
    },
  );
}
