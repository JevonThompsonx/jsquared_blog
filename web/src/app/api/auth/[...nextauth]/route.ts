import NextAuth from "next-auth";
import type { NextRequest } from "next/server";

import { buildAdminAuthOptions } from "@/lib/auth/admin";

let handler: ReturnType<typeof NextAuth> | null = null;

type AuthRouteContext = {
  params: Promise<{ nextauth: string[] }>;
};

function getHandler() {
  if (!handler) {
    handler = NextAuth(buildAdminAuthOptions());
  }

  return handler;
}

export function GET(request: NextRequest, context: AuthRouteContext) {
  return getHandler()(request, context);
}

export function POST(request: NextRequest, context: AuthRouteContext) {
  return getHandler()(request, context);
}
