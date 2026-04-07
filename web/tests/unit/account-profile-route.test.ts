import type { User } from "@supabase/supabase-js";

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/supabase/server", () => ({
  getRequestSupabaseUser: vi.fn(),
}));

vi.mock("@/server/auth/public-users", () => ({
  ensurePublicAppUser: vi.fn(),
  getPublicAppUserBySupabaseId: vi.fn(),
}));

vi.mock("@/server/dal/profiles", () => ({
  getProfileByUserId: vi.fn(),
  updateProfileFields: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

import { GET } from "@/app/api/account/profile/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getRequestSupabaseUser } from "@/lib/supabase/server";
import { ensurePublicAppUser, getPublicAppUserBySupabaseId } from "@/server/auth/public-users";
import { getProfileByUserId } from "@/server/dal/profiles";

function makeSupabaseUser(id = "supabase-user-1"): User {
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("GET /api/account/profile", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/account/profile"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns throttled response when rate limited", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await GET(new Request("http://localhost/api/account/profile"));

    expect(response).toBe(throttled);
    expect(vi.mocked(getPublicAppUserBySupabaseId)).not.toHaveBeenCalled();
  });

  it("returns profile payload for valid requests", async () => {
    vi.mocked(getRequestSupabaseUser).mockResolvedValue(makeSupabaseUser());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(getPublicAppUserBySupabaseId).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(getProfileByUserId).mockResolvedValue({
      userId: "public-user-1",
      displayName: "Reader",
      avatarUrl: null,
      themePreference: null,
    });

    const response = await GET(new Request("http://localhost/api/account/profile"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      profile: {
        userId: "public-user-1",
        displayName: "Reader",
        avatarUrl: null,
        themePreference: null,
        email: "reader@example.com",
      },
    });
  });

  it("provisions the public app user on first authenticated profile fetch", async () => {
    const supabaseUser = makeSupabaseUser();

    vi.mocked(getRequestSupabaseUser).mockResolvedValue(supabaseUser);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(getPublicAppUserBySupabaseId).mockResolvedValueOnce(null);
    vi.mocked(ensurePublicAppUser).mockResolvedValue({
      id: "public-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    vi.mocked(getProfileByUserId).mockResolvedValue({
      userId: "public-user-1",
      displayName: "Reader",
      avatarUrl: null,
      themePreference: null,
    });

    const response = await GET(new Request("http://localhost/api/account/profile"));

    expect(response.status).toBe(200);
    expect(vi.mocked(ensurePublicAppUser)).toHaveBeenCalledWith(supabaseUser);
    expect(await response.json()).toEqual({
      profile: {
        userId: "public-user-1",
        displayName: "Reader",
        avatarUrl: null,
        themePreference: null,
        email: "reader@example.com",
      },
    });
  });
});
