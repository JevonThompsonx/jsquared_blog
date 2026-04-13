import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

import { POST } from "@/app/api/admin/song-preview/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

function createRequest(url: string): Request {
  return new Request("http://localhost/api/admin/song-preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });
}

describe("POST /api/admin/song-preview", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("rejects non-admin callers", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await POST(createRequest("https://open.spotify.com/track/abc12345"));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await POST(createRequest("https://open.spotify.com/track/abc12345"));

    expect(response).toBe(throttled);
  });

  it("rejects invalid song preview requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(createRequest("javascript:alert(1)"));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Invalid song preview request" });
  });

  it("rejects invalid JSON payloads", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/song-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{bad json",
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Invalid song preview request" });
  });

  it("returns a manual preview for non-Spotify HTTPS URLs", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(createRequest("https://music.example.com/track/123"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      song: {
        title: null,
        artist: null,
        url: "https://music.example.com/track/123",
        spotify: null,
      },
      source: "manual",
    });
  });

  it("returns Spotify oEmbed metadata for Spotify links", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Holocene",
        thumbnail_url: "https://i.scdn.co/image/example",
      }),
    } as Response);

    const response = await POST(createRequest("https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      song: {
        title: "Holocene",
        artist: null,
        url: "https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl",
        spotify: {
          kind: "track",
          canonicalUrl: "https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl",
          embedUrl: "https://open.spotify.com/embed/track/4bHsxqR3GMjc5K5kKkXmBl?utm_source=generator&theme=0",
          height: 152,
        },
      },
      artworkUrl: "https://i.scdn.co/image/example",
      source: "spotify-oembed",
    });
  });

  it("drops unsafe artwork URLs from the Spotify preview payload", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        title: "Holocene",
        thumbnail_url: "https://example.com/not-spotify.jpg",
      }),
    } as Response);

    const response = await POST(createRequest("https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      artworkUrl: null,
      source: "spotify-oembed",
    });
  });

  it("returns a generic upstream failure response when Spotify preview lookup fails", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ user: { id: "admin-1", role: "admin" } } as never);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("socket hang up"));

    const response = await POST(createRequest("https://open.spotify.com/track/4bHsxqR3GMjc5K5kKkXmBl"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Song preview unavailable" });
  });
});
