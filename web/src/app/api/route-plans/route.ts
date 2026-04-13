import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ROUTE_PLANNER_RETIRED_RESPONSE = {
  error: "Route planner retired",
  redirectTo: "/wishlist",
} as const;

export async function POST(_request: Request): Promise<NextResponse> {
  return NextResponse.json(ROUTE_PLANNER_RETIRED_RESPONSE, { status: 410 });
}
