import NextAuthModule from "next-auth";
import type { NextRequest } from "next/server";

import { buildAdminAuthOptions } from "@/lib/auth/admin";

// next-auth v4 ships CommonJS. Depending on the bundler interop the default
// import can be the NextAuth function, a namespace whose `.default` is the
// function, or a nested CJS wrapper. Resolve all three so vinext/Vite and
// Next.js behave the same.
function resolveNextAuth(moduleValue: any): any {
  if (typeof moduleValue === "function") return moduleValue;
  if (typeof moduleValue?.default === "function") return moduleValue.default;
  if (typeof moduleValue?.default?.default === "function")
    return moduleValue.default.default;
  if (typeof moduleValue?.["module.exports"] === "function")
    return moduleValue["module.exports"];
  return moduleValue;
}

const NextAuth = resolveNextAuth(NextAuthModule);

let handler: any = null;

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
