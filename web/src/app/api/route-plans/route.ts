import { NextResponse } from "next/server";

import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { routePlannerRequestSchema } from "@/server/forms/route-planner";
import { NoRoutePlannerSuggestionsError, planPublicWishlistRoute } from "@/server/services/route-planner";
import {
  RoutePlannerProviderConfigurationError,
  RoutePlannerProviderUpstreamError,
} from "@/server/services/route-planner-provider";

export const runtime = "nodejs";

const MAX_ROUTE_PLANNER_REQUEST_BYTES = 20_000;

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rl = await checkRateLimit(`route-plans:${getClientIp(request)}`, 10, 60_000);
    if (!rl.allowed) {
      return tooManyRequests(rl);
    }
  } catch (error) {
    console.error("Route planner rate limit failure", error);
    return NextResponse.json({ error: "Route planner unavailable" }, { status: 503 });
  }

  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : Number.NaN;

  if (Number.isFinite(contentLength) && contentLength > MAX_ROUTE_PLANNER_REQUEST_BYTES) {
    return NextResponse.json({ error: "Route planner request too large" }, { status: 413 });
  }

  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid route planner request" }, { status: 422 });
  }

  if (new TextEncoder().encode(rawBody).length > MAX_ROUTE_PLANNER_REQUEST_BYTES) {
    return NextResponse.json({ error: "Route planner request too large" }, { status: 413 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid route planner request" }, { status: 422 });
  }

  const parsed = routePlannerRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid route planner request" }, { status: 422 });
  }

  try {
    const plan = await planPublicWishlistRoute(parsed.data);

    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof NoRoutePlannerSuggestionsError) {
      return NextResponse.json({ error: "No route suggestions available" }, { status: 404 });
    }

    if (error instanceof RoutePlannerProviderConfigurationError) {
      console.error("Route planner configuration error", error);
      return NextResponse.json({ error: "Route planner unavailable" }, { status: 503 });
    }

    if (error instanceof RoutePlannerProviderUpstreamError) {
      console.error("Route planner upstream error", error);
      return NextResponse.json({ error: "Failed to plan route" }, { status: 502 });
    }

    console.error("Unexpected route planner failure", error);
    return NextResponse.json({ error: "Failed to plan route" }, { status: 500 });
  }
}
