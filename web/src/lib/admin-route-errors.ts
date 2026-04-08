import { NextResponse } from "next/server";

export function logAdminRouteFailure(
  message: string,
  context: Record<string, unknown>,
): void {
  console.error(message, context);
}

export function adminRouteFailureResponse(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 500 });
}
