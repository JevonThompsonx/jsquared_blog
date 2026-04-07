import type { AdminSession } from "@/lib/auth/session";

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/server/posts/content", () => ({
  derivePostContent: vi.fn(),
}));

import { POST } from "@/app/api/admin/posts/warnings/route";
import { requireAdminSession } from "@/lib/auth/session";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { derivePostContent } from "@/server/posts/content";

function makeAdminSession(): AdminSession {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: "admin-1",
      role: "admin",
    },
  };
}

describe("POST /api/admin/posts/warnings", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/admin/posts/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: "{}" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await POST(
      new Request("http://localhost/api/admin/posts/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: "{}" }),
      }),
    );

    expect(response).toBe(throttled);
    expect(vi.mocked(derivePostContent)).not.toHaveBeenCalled();
  });

  it("returns safe validation errors", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excerpt: "missing content json" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid warnings request" });
  });

  it("returns a safe 400 for invalid editor content after request validation", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(derivePostContent).mockImplementation(() => {
      throw new Error("Content must be valid Tiptap JSON");
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: "{}", excerpt: null }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid warnings request" });
  });

  it("returns derived warnings for valid requests", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(derivePostContent).mockReturnValue({
      canonicalContentJson: "{}",
      contentFormat: "tiptap-json",
      contentHtml: "<p>Sample</p>",
      contentPlainText: "Sample",
      excerpt: "Sample",
      imageAltWarnings: [
        {
          code: "missing-image-alt",
          message: "Image is missing alt text",
          path: [0],
          imageSrc: "https://example.com/image.jpg",
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: "{}", excerpt: null }),
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(derivePostContent)).toHaveBeenCalledWith("{}", null);
    expect(await response.json()).toEqual({
      warnings: [
        {
          code: "missing-image-alt",
          message: "Image is missing alt text",
          path: [0],
          imageSrc: "https://example.com/image.jpg",
        },
      ],
      excerpt: "Sample",
    });
  });

  it("returns a safe 500 when warning derivation fails after validation", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(makeAdminSession());
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(derivePostContent).mockImplementation(() => {
      throw new Error("Renderer exploded");
    });

    const response = await POST(
      new Request("http://localhost/api/admin/posts/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: "{}", excerpt: null }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to validate warnings" });
  });
});
