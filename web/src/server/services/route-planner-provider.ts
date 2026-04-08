import { z } from "zod";

import type { RoutePlannerRequest } from "@/server/forms/route-planner";

const DEFAULT_ROUTE_PLANNER_TIMEOUT_MS = 10_000;
const DEFAULT_GEOCODING_TIMEOUT_MS = 8_000;

const geoapifyGeocodeResponseSchema = z.object({
  results: z.array(z.object({
    lat: z.number().finite(),
    lon: z.number().finite(),
    formatted: z.string().trim().min(1),
  })).min(1),
});

const geoapifyRouteResponseSchema = z.object({
  features: z.array(z.object({
    geometry: z.object({
      coordinates: z.array(z.tuple([z.number().finite(), z.number().finite()])).min(2),
    }),
    properties: z.object({
      distance: z.number().finite().nonnegative(),
      time: z.number().finite().nonnegative(),
    }),
  })).min(1),
});

export class RoutePlannerProviderConfigurationError extends Error {}

export class RoutePlannerProviderUpstreamError extends Error {}

export type RoutePlannerWaypoint = {
  label: string;
  lat: number;
  lng: number;
};

export type RoutePlannerGeometryPoint = {
  lat: number;
  lng: number;
};

export type RoutePlannerProviderResult = {
  provider: "geoapify";
  origin: RoutePlannerWaypoint;
  destination: RoutePlannerWaypoint;
  distanceMeters: number;
  durationSeconds: number;
  geometry: RoutePlannerGeometryPoint[];
};

type RoutePlannerEnv = Partial<NodeJS.ProcessEnv>;

type FetchImplementation = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface RoutePlannerProvider {
  planRoute(input: Pick<RoutePlannerRequest, "origin" | "destination" | "mode">): Promise<RoutePlannerProviderResult>;
}

function parseTimeoutMs(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  controller.signal.addEventListener("abort", () => {
    clearTimeout(timeout);
  }, { once: true });

  return controller.signal;
}

async function fetchJson(
  fetchImpl: FetchImplementation,
  url: URL,
  timeoutMs: number,
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: createTimeoutSignal(timeoutMs),
    });
  } catch (error) {
    throw new RoutePlannerProviderUpstreamError("Route planner request failed", { cause: error });
  }

  if (!response.ok) {
    throw new RoutePlannerProviderUpstreamError(`Route planner upstream returned ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new RoutePlannerProviderUpstreamError("Route planner upstream returned invalid JSON", { cause: error });
  }
}

async function geocodeLocation(
  fetchImpl: FetchImplementation,
  apiKey: string,
  location: string,
  timeoutMs: number,
): Promise<RoutePlannerWaypoint> {
  const geocodeUrl = new URL("https://api.geoapify.com/v1/geocode/search");
  geocodeUrl.searchParams.set("text", location);
  geocodeUrl.searchParams.set("limit", "1");
  geocodeUrl.searchParams.set("apiKey", apiKey);

  const payload = await fetchJson(fetchImpl, geocodeUrl, timeoutMs);
  const parsed = geoapifyGeocodeResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new RoutePlannerProviderUpstreamError("Route planner geocoding returned an unexpected payload", {
      cause: parsed.error,
    });
  }

  const [result] = parsed.data.results;
  if (!result) {
    throw new RoutePlannerProviderUpstreamError("Route planner geocoding returned no results");
  }

  return {
    label: result.formatted,
    lat: result.lat,
    lng: result.lon,
  };
}

export function createGeoapifyRoutePlannerProvider(options?: {
  env?: RoutePlannerEnv;
  fetchImpl?: FetchImplementation;
}): RoutePlannerProvider {
  const env = options?.env ?? process.env;
  const fetchImpl = options?.fetchImpl ?? fetch;

  return {
    async planRoute(input) {
      if (env.ROUTING_PROVIDER && env.ROUTING_PROVIDER !== "geoapify") {
        throw new RoutePlannerProviderConfigurationError("Unsupported routing provider");
      }

      if (env.GEOCODING_PROVIDER && env.GEOCODING_PROVIDER !== "geoapify") {
        throw new RoutePlannerProviderConfigurationError("Unsupported geocoding provider");
      }

      const apiKey = env.GEOAPIFY_API_KEY?.trim();
      if (!apiKey) {
        throw new RoutePlannerProviderConfigurationError("GEOAPIFY_API_KEY is required");
      }

      const geocodingTimeoutMs = parseTimeoutMs(env.GEOCODING_TIMEOUT_MS, DEFAULT_GEOCODING_TIMEOUT_MS);
      const routingTimeoutMs = parseTimeoutMs(env.ROUTE_PLANNER_TIMEOUT_MS, DEFAULT_ROUTE_PLANNER_TIMEOUT_MS);

      const origin = await geocodeLocation(fetchImpl, apiKey, input.origin, geocodingTimeoutMs);
      const destination = await geocodeLocation(fetchImpl, apiKey, input.destination, geocodingTimeoutMs);

      const routeUrl = new URL("https://api.geoapify.com/v1/routing");
      routeUrl.searchParams.set("waypoints", `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`);
      routeUrl.searchParams.set("mode", input.mode);
      routeUrl.searchParams.set("apiKey", apiKey);

      const payload = await fetchJson(fetchImpl, routeUrl, routingTimeoutMs);
      const parsed = geoapifyRouteResponseSchema.safeParse(payload);

      if (!parsed.success) {
        throw new RoutePlannerProviderUpstreamError("Route planner routing returned an unexpected payload", {
          cause: parsed.error,
        });
      }

      const [feature] = parsed.data.features;
      if (!feature) {
        throw new RoutePlannerProviderUpstreamError("Route planner routing returned no route");
      }

      return {
        provider: "geoapify",
        origin,
        destination,
        distanceMeters: feature.properties.distance,
        durationSeconds: feature.properties.time,
        geometry: feature.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      };
    },
  };
}
