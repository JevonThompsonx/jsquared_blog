/**
 * Distributed sliding-window rate limiter backed by Upstash Redis.
 *
 * Uses @upstash/ratelimit when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set (production / staging). Falls back to an
 * in-process store for local dev and test environments where Redis is not
 * available — note that the fallback is NOT consistent across Vercel instances.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import { hasUpstashRedisCredentials, isDeployedEnvironment } from "@/lib/env";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // unix ms
};

// ---------------------------------------------------------------------------
// IP helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 429 response helper
// ---------------------------------------------------------------------------

/** Returns a 429 NextResponse with standard rate-limit headers. */
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

// ---------------------------------------------------------------------------
// Upstash Redis limiter
// ---------------------------------------------------------------------------

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit {
  const configKey = `${limit}:${windowMs}`;
  const existing = upstashLimiters.get(configKey);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    }),
    limiter: Ratelimit.slidingWindow(limit, `${Math.round(windowMs / 1000)} s`),
    prefix: "j2:rl",
  });

  upstashLimiters.set(configKey, limiter);
  return limiter;
}

async function checkUpstash(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(limit, windowMs);
  const result = await limiter.limit(key);
  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}

// ---------------------------------------------------------------------------
// In-memory fallback limiter
// ---------------------------------------------------------------------------

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();
let sweepCounter = 0;

function sweep(now: number): void {
  for (const [k, entry] of store) {
    if (entry.resetAt <= now) store.delete(k);
  }
}

function checkInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();

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

  const newCount = entry.count + 1;
  store.set(key, { ...entry, count: newCount });
  return { allowed: true, limit, remaining: limit - newCount, resetAt: entry.resetAt };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function isUpstashConfigured(): boolean {
  return hasUpstashRedisCredentials(process.env);
}

/**
 * Check and update the rate limit for `key` (e.g. `"comment:<ip>"`).
 *
 * Uses Upstash Redis when configured (globally consistent across Vercel
 * instances). Falls back to in-process memory otherwise.
 *
 * @param key      Unique identifier for this bucket (route + IP or userId)
 * @param limit    Maximum allowed calls per window
 * @param windowMs Window duration in milliseconds
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (isUpstashConfigured()) {
    return checkUpstash(key, limit, windowMs);
  }

  if (isDeployedEnvironment(process.env)) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in deployed environments for rate limiting.",
    );
  }

  return checkInMemory(key, limit, windowMs);
}
