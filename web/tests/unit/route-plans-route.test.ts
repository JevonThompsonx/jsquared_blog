import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
  tooManyRequests: vi.fn(() => NextResponse.json({ error: "Too many requests" }, { status: 429 })),
}));

vi.mock("@/server/services/route-planner", () => ({
  NoRoutePlannerSuggestionsError: class NoRoutePlannerSuggestionsError extends Error {},
  planPublicWishlistRoute: vi.fn(),
}));

vi.mock("@/server/services/route-planner-provider", () => ({
  RoutePlannerProviderConfigurationError: class RoutePlannerProviderConfigurationError extends Error {},
  RoutePlannerProviderUpstreamError: class RoutePlannerProviderUpstreamError extends Error {},
}));

import { POST } from "@/app/api/route-plans/route";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { NoRoutePlannerSuggestionsError, planPublicWishlistRoute } from "@/server/services/route-planner";
import {
  RoutePlannerProviderConfigurationError,
  RoutePlannerProviderUpstreamError,
} from "@/server/services/route-planner-provider";

describe("POST /api/route-plans", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the throttled response when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });
    const throttled = NextResponse.json({ error: "Too many requests" }, { status: 429 });
    vi.mocked(tooManyRequests).mockReturnValue(throttled);

    const response = await POST(new Request("http://localhost/api/route-plans", {
      method: "POST",
      body: JSON.stringify({}),
    }));

    expect(response).toBe(throttled);
    expect(vi.mocked(planPublicWishlistRoute)).not.toHaveBeenCalled();
  });

  it("returns 422 for invalid request payloads", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(new Request("http://localhost/api/route-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "public-wishlist", origin: "", destination: "Banff, AB" }),
    }));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Invalid route planner request" });
  });

  it("returns 413 before parsing oversized request bodies", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const response = await POST(
      new Request("http://localhost/api/route-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": "20001",
        },
        body: JSON.stringify({
          source: "public-wishlist",
          origin: "Seattle, WA",
          destination: "Banff, AB",
        }),
      }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Route planner request too large" });
    expect(vi.mocked(planPublicWishlistRoute)).not.toHaveBeenCalled();
  });

  it("returns 413 for oversized bodies without a content-length header", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    const oversizedBody = JSON.stringify({
      source: "public-wishlist",
      origin: "S".repeat(20_100),
      destination: "Banff, AB",
    });

    const response = await POST(
      new Request("http://localhost/api/route-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: oversizedBody,
      }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Route planner request too large" });
    expect(vi.mocked(planPublicWishlistRoute)).not.toHaveBeenCalled();
  });

  it("returns 503 when rate limiting cannot be evaluated", async () => {
    vi.mocked(checkRateLimit).mockRejectedValue(new Error("upstash unavailable"));

    const response = await POST(
      new Request("http://localhost/api/route-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "public-wishlist",
          origin: "Seattle, WA",
          destination: "Banff, AB",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Route planner unavailable" });
    expect(vi.mocked(planPublicWishlistRoute)).not.toHaveBeenCalled();
  });

  it("returns 404 when no public wishlist suggestions remain", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(planPublicWishlistRoute).mockRejectedValue(new NoRoutePlannerSuggestionsError("none"));

    const response = await POST(new Request("http://localhost/api/route-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Banff, AB",
      }),
    }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "No route suggestions available" });
  });

  it("returns 503 when the provider is unavailable", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(planPublicWishlistRoute).mockRejectedValue(new RoutePlannerProviderConfigurationError("missing key"));

    const response = await POST(new Request("http://localhost/api/route-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Banff, AB",
      }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Route planner unavailable" });
  });

  it("returns 502 for upstream route-planning failures", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(planPublicWishlistRoute).mockRejectedValue(new RoutePlannerProviderUpstreamError("bad gateway"));

    const response = await POST(new Request("http://localhost/api/route-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Banff, AB",
      }),
    }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Failed to plan route" });
  });

  it("returns a normalized route-plan response", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });
    vi.mocked(planPublicWishlistRoute).mockResolvedValue({
      provider: "geoapify",
      mode: "drive",
      origin: { label: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
      destination: { label: "Banff, AB", lat: 51.1784, lng: -115.5708 },
      totals: { distanceMeters: 12345, durationSeconds: 6789 },
      geometry: [
        { lat: 47.6062, lng: -122.3321 },
        { lat: 51.1784, lng: -115.5708 },
      ],
      suggestions: [
        {
          id: "place-1",
          name: "Glacier National Park",
          locationName: "West Glacier, MT",
          locationLat: 48.7596,
          locationLng: -113.787,
          locationZoom: 8,
          sortOrder: 0,
          visited: false,
          externalUrl: null,
          description: null,
          distanceFromRouteKm: 10.5,
          routeProgress: 0.45,
        },
      ],
    });

    const response = await POST(new Request("http://localhost/api/route-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "public-wishlist",
        origin: "Seattle, WA",
        destination: "Banff, AB",
        mode: "drive",
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      plan: {
        provider: "geoapify",
        mode: "drive",
        origin: { label: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
        destination: { label: "Banff, AB", lat: 51.1784, lng: -115.5708 },
        totals: { distanceMeters: 12345, durationSeconds: 6789 },
        geometry: [
          { lat: 47.6062, lng: -122.3321 },
          { lat: 51.1784, lng: -115.5708 },
        ],
        suggestions: [
          {
            id: "place-1",
            name: "Glacier National Park",
            locationName: "West Glacier, MT",
            locationLat: 48.7596,
            locationLng: -113.787,
            locationZoom: 8,
            sortOrder: 0,
            visited: false,
            externalUrl: null,
            description: null,
            distanceFromRouteKm: 10.5,
            routeProgress: 0.45,
          },
        ],
      },
    });
  });
});
