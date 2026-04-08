import type { RoutePlannerRequest } from "@/server/forms/route-planner";
import { listPublicWishlistPlaces, type PublicWishlistPlace } from "@/server/queries/wishlist";
import {
  createGeoapifyRoutePlannerProvider,
  type RoutePlannerGeometryPoint,
  type RoutePlannerProvider,
  type RoutePlannerWaypoint,
} from "@/server/services/route-planner-provider";

const DEFAULT_MAX_ROUTE_PLANNER_STOPS = 10;

export class NoRoutePlannerSuggestionsError extends Error {}

type PlannerSuggestion = PublicWishlistPlace & {
  distanceFromRouteKm: number;
  routeProgress: number;
};

export type PlannedPublicWishlistRoute = {
  provider: "geoapify";
  mode: RoutePlannerRequest["mode"];
  origin: RoutePlannerWaypoint;
  destination: RoutePlannerWaypoint;
  totals: {
    distanceMeters: number;
    durationSeconds: number;
  };
  geometry: RoutePlannerGeometryPoint[];
  suggestions: PlannerSuggestion[];
};

function parseMaxSuggestions(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_MAX_ROUTE_PLANNER_STOPS;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed < 2) {
    return DEFAULT_MAX_ROUTE_PLANNER_STOPS;
  }

  return Math.min(parsed, 10);
}

function toProjectedKilometers(point: RoutePlannerGeometryPoint) {
  const latRadians = point.lat * (Math.PI / 180);

  return {
    x: point.lng * 111.32 * Math.cos(latRadians),
    y: point.lat * 110.574,
  };
}

function getRouteProjectionMetrics(
  geometry: RoutePlannerGeometryPoint[],
  point: RoutePlannerGeometryPoint,
): { distanceFromRouteKm: number; routeProgress: number } {
  if (geometry.length < 2) {
    return { distanceFromRouteKm: Number.POSITIVE_INFINITY, routeProgress: 0 };
  }

  const projectedPoint = toProjectedKilometers(point);
  const segmentCount = geometry.length - 1;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestProgress = 0;

  for (let index = 0; index < segmentCount; index += 1) {
    const startPoint = geometry[index];
    const endPoint = geometry[index + 1];

    if (!startPoint || !endPoint) {
      continue;
    }

    const start = toProjectedKilometers(startPoint);
    const end = toProjectedKilometers(endPoint);
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const segmentLengthSquared = (deltaX * deltaX) + (deltaY * deltaY);

    let projection = 0;
    if (segmentLengthSquared > 0) {
      projection = ((projectedPoint.x - start.x) * deltaX + (projectedPoint.y - start.y) * deltaY) / segmentLengthSquared;
    }

    const clampedProjection = Math.min(1, Math.max(0, projection));
    const nearestX = start.x + (deltaX * clampedProjection);
    const nearestY = start.y + (deltaY * clampedProjection);
    const distance = Math.hypot(projectedPoint.x - nearestX, projectedPoint.y - nearestY);
    const progress = (index + clampedProjection) / segmentCount;

    if (distance < bestDistance || (distance === bestDistance && progress < bestProgress)) {
      bestDistance = distance;
      bestProgress = progress;
    }
  }

  return {
    distanceFromRouteKm: Number(bestDistance.toFixed(2)),
    routeProgress: Number(bestProgress.toFixed(4)),
  };
}

export async function planPublicWishlistRoute(
  input: RoutePlannerRequest,
  options?: {
    listPlaces?: () => Promise<PublicWishlistPlace[]>;
    provider?: RoutePlannerProvider;
    maxSuggestions?: number;
    env?: Partial<NodeJS.ProcessEnv>;
  },
): Promise<PlannedPublicWishlistRoute> {
  const listPlaces = options?.listPlaces ?? listPublicWishlistPlaces;
  const provider = options?.provider ?? createGeoapifyRoutePlannerProvider({ env: options?.env });
  const maxSuggestions = options?.maxSuggestions ?? parseMaxSuggestions(options?.env?.ROUTE_PLANNER_MAX_STOPS ?? process.env.ROUTE_PLANNER_MAX_STOPS);

  const publicPlaces = await listPlaces();
  const eligiblePlaces = input.includeVisited
    ? publicPlaces
    : publicPlaces.filter((place) => !place.visited);

  if (eligiblePlaces.length === 0) {
    throw new NoRoutePlannerSuggestionsError("No public wishlist stops remain after filtering");
  }

  const route = await provider.planRoute({
    origin: input.origin,
    destination: input.destination,
    mode: input.mode,
  });

  const suggestions = eligiblePlaces
    .map((place) => ({
      ...place,
      ...getRouteProjectionMetrics(route.geometry, {
        lat: place.locationLat,
        lng: place.locationLng,
      }),
    }))
    .sort((left, right) => {
      if (left.distanceFromRouteKm !== right.distanceFromRouteKm) {
        return left.distanceFromRouteKm - right.distanceFromRouteKm;
      }

      if (left.routeProgress !== right.routeProgress) {
        return left.routeProgress - right.routeProgress;
      }

      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, maxSuggestions);

  suggestions.sort((left, right) => {
    if (left.routeProgress !== right.routeProgress) {
      return left.routeProgress - right.routeProgress;
    }

    if (left.distanceFromRouteKm !== right.distanceFromRouteKm) {
      return left.distanceFromRouteKm - right.distanceFromRouteKm;
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });

  if (suggestions.length === 0) {
    throw new NoRoutePlannerSuggestionsError("No route suggestions available");
  }

  return {
    provider: route.provider,
    mode: input.mode,
    origin: route.origin,
    destination: route.destination,
    totals: {
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
    },
    geometry: route.geometry,
    suggestions,
  };
}
