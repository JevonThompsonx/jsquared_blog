import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, limit: 30, remaining: 29, resetAt: Date.now() + 60_000 })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/server/supabase/keepalive", () => ({
  pingSupabaseKeepalive: vi.fn(),
}));

import { GET } from "@/app/api/cron/keep-supabase-awake/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { pingSupabaseKeepalive } from "@/server/supabase/keepalive";

describe("GET /api/cron/keep-supabase-awake", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns throttled response when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 30, remaining: 0, resetAt: Date.now() + 60_000 });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/cron/keep-supabase-awake"));

    expect(response).toBe(throttled);
    expect(vi.mocked(pingSupabaseKeepalive)).not.toHaveBeenCalled();
  });

  it("returns generic 500 outside local-only runs when CRON_SECRET is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(new Request("http://localhost/api/cron/keep-supabase-awake"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal error" });
    expect(vi.mocked(pingSupabaseKeepalive)).not.toHaveBeenCalled();
  });

  it("returns generic 500 for non-loopback requests when CRON_SECRET is missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET(new Request("https://preview.example.com/api/cron/keep-supabase-awake"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal error" });
    expect(vi.mocked(pingSupabaseKeepalive)).not.toHaveBeenCalled();
  });

  it("returns 401 when cron secret is configured but token is invalid", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "very-secret-token");

    const response = await GET(
      new Request("http://localhost/api/cron/keep-supabase-awake", {
        headers: { authorization: "Bearer wrong-token" },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(vi.mocked(pingSupabaseKeepalive)).not.toHaveBeenCalled();
  });

  it("allows local loopback runs when CRON_SECRET is not set", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CRON_SECRET", "");

    vi.mocked(pingSupabaseKeepalive).mockResolvedValue({
      ok: true,
      nowIso: "2026-04-06T20:00:00.000Z",
      service: "auth",
    });

    const response = await GET(new Request("http://localhost/api/cron/keep-supabase-awake"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      nowIso: "2026-04-06T20:00:00.000Z",
      service: "auth",
    });
  });

  it("pings Supabase successfully when bearer token matches secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "very-secret-token");

    vi.mocked(pingSupabaseKeepalive).mockResolvedValue({
      ok: true,
      nowIso: "2026-04-06T21:00:00.000Z",
      service: "auth",
    });

    const response = await GET(
      new Request("http://localhost/api/cron/keep-supabase-awake", {
        headers: { authorization: "Bearer very-secret-token" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      nowIso: "2026-04-06T21:00:00.000Z",
      service: "auth",
    });
    expect(vi.mocked(pingSupabaseKeepalive)).toHaveBeenCalledOnce();
  });

  it("returns a safe 500 response when the heartbeat fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "very-secret-token");
    vi.mocked(pingSupabaseKeepalive).mockRejectedValue(new Error("upstream failure"));

    const response = await GET(
      new Request("http://localhost/api/cron/keep-supabase-awake", {
        headers: { authorization: "Bearer very-secret-token" },
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal error" });
  });
});
