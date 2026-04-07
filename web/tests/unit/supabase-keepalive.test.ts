import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  getServerEnv: vi.fn(() => ({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_ANON_KEY: "anon-key",
  })),
}));

import { pingSupabaseKeepalive } from "@/server/supabase/keepalive";

describe("pingSupabaseKeepalive", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("calls the Supabase auth health endpoint with the anon api key", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-06T22:00:00.000Z"));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(pingSupabaseKeepalive()).resolves.toEqual({
      ok: true,
      nowIso: "2026-04-06T22:00:00.000Z",
      service: "auth",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/health",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: {
          apikey: "anon-key",
        },
      }),
    );
  });

  it("throws when Supabase health returns a failure status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(pingSupabaseKeepalive()).rejects.toThrow(
      "Supabase keepalive failed with status 503",
    );
  });
});
