import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/server/services/newsletter", () => ({
  isNewsletterConfigured: vi.fn(),
  subscribeToNewsletter: vi.fn(),
}));

import { POST } from "@/app/api/newsletter/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
  isNewsletterConfigured,
  subscribeToNewsletter,
} from "@/server/services/newsletter";

describe("POST /api/newsletter", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 429 when throttled", async () => {
    const throttledResponse = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false, limit: 5, remaining: 0, resetAt: Date.now() + 60_000 });
    vi.mocked(tooManyRequests).mockReturnValue(throttledResponse);

    const response = await POST(new Request("http://localhost/api/newsletter", { method: "POST", body: "{}" }));

    expect(response).toBe(throttledResponse);
  });

  it("validates the request body", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });

    const response = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid newsletter signup request" });
    expect(vi.mocked(subscribeToNewsletter)).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON payloads", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });

    const response = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid JSON payload" });
    expect(vi.mocked(subscribeToNewsletter)).not.toHaveBeenCalled();
  });

  it("does not disclose setup instructions when config is missing", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(isNewsletterConfigured).mockReturnValue(false);

    const response = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com" }),
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      status: "skipped",
      reason: "missing-config",
    });
  });

  it("returns 200 when the contact is already subscribed", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(isNewsletterConfigured).mockReturnValue(true);
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ status: "already-subscribed" });

    const response = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "already-subscribed" });
  });

  it("returns 202 when the newsletter service skips the request", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(isNewsletterConfigured).mockReturnValue(true);
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ status: "skipped", reason: "missing-config" });

    const response = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com" }),
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: "skipped", reason: "missing-config" });
  });

  it("creates a subscription when configured", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(isNewsletterConfigured).mockReturnValue(true);
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ status: "subscribed", source: "created" });

    const response = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "Reader@Example.com", source: "footer-form" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(vi.mocked(subscribeToNewsletter)).toHaveBeenCalledWith({
      email: "reader@example.com",
      firstName: undefined,
      lastName: undefined,
      source: "footer-form",
    });
    expect(await response.json()).toEqual({ status: "subscribed", source: "created" });
  });

  it("returns a safe 500 when the newsletter provider fails unexpectedly", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(isNewsletterConfigured).mockReturnValue(true);
    vi.mocked(subscribeToNewsletter).mockRejectedValue(new Error("provider offline"));

    const response = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to subscribe" });
  });

  it("returns a safe 500 when the newsletter service returns an unexpected status", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, limit: 5, remaining: 4, resetAt: Date.now() + 60_000 });
    vi.mocked(isNewsletterConfigured).mockReturnValue(true);
    vi.mocked(subscribeToNewsletter).mockResolvedValue({ status: "unexpected" } as never);

    const response = await POST(
      new Request("http://localhost/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reader@example.com" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to subscribe" });
  });
});
