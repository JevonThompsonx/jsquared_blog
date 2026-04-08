import { afterEach, describe, expect, it, vi } from "vitest";

import {
  RoutePlannerProviderConfigurationError,
  RoutePlannerProviderUpstreamError,
  createGeoapifyRoutePlannerProvider,
} from "@/server/services/route-planner-provider";

describe("createGeoapifyRoutePlannerProvider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createFetchMock() {
    return vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>();
  }

  it("fails closed when the Geoapify API key is missing", async () => {
    const provider = createGeoapifyRoutePlannerProvider({
      env: {},
      fetchImpl: createFetchMock(),
    });

    await expect(provider.planRoute({
      origin: "Seattle, WA",
      destination: "Banff, AB",
      mode: "drive",
    })).rejects.toBeInstanceOf(RoutePlannerProviderConfigurationError);
  });

  it("geocodes both endpoints and normalizes the routed response", async () => {
    const fetchImpl = createFetchMock()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          results: [{ lat: 47.6062, lon: -122.3321, formatted: "Seattle, WA" }],
        })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          results: [{ lat: 51.1784, lon: -115.5708, formatted: "Banff, AB" }],
        })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          features: [{
            geometry: {
              coordinates: [[-122.3321, 47.6062], [-115.5708, 51.1784]],
            },
            properties: {
              distance: 12345,
              time: 6789,
            },
          }],
        })),
      );

    const provider = createGeoapifyRoutePlannerProvider({
      env: {
        GEOAPIFY_API_KEY: "test-key",
        ROUTING_PROVIDER: "geoapify",
        GEOCODING_PROVIDER: "geoapify",
        ROUTE_PLANNER_TIMEOUT_MS: "5000",
        GEOCODING_TIMEOUT_MS: "4000",
      },
      fetchImpl,
    });

    const result = await provider.planRoute({
      origin: "Seattle, WA",
      destination: "Banff, AB",
      mode: "drive",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      provider: "geoapify",
      origin: { label: "Seattle, WA", lat: 47.6062, lng: -122.3321 },
      destination: { label: "Banff, AB", lat: 51.1784, lng: -115.5708 },
      distanceMeters: 12345,
      durationSeconds: 6789,
      geometry: [
        { lat: 47.6062, lng: -122.3321 },
        { lat: 51.1784, lng: -115.5708 },
      ],
    });
  });

  it("returns a safe upstream error when routing fails", async () => {
    const fetchImpl = createFetchMock()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          results: [{ lat: 47.6062, lon: -122.3321, formatted: "Seattle, WA" }],
        })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({
          results: [{ lat: 51.1784, lon: -115.5708, formatted: "Banff, AB" }],
        })),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 502 }));

    const provider = createGeoapifyRoutePlannerProvider({
      env: { GEOAPIFY_API_KEY: "test-key" },
      fetchImpl,
    });

    await expect(provider.planRoute({
      origin: "Seattle, WA",
      destination: "Banff, AB",
      mode: "drive",
    })).rejects.toBeInstanceOf(RoutePlannerProviderUpstreamError);
  });
});
