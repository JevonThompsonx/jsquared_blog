import "server-only";

import { NextResponse } from "next/server";

const PUBLIC_ORIGINS = new Set([
  "https://jsquaredadventures.com",
  "https://www.jsquaredadventures.com",
  "https://next.jsquaredadventures.com",
]);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Cookie-authenticated public mutations need an Origin check. AuthKit protects
 * its own PKCE endpoints; this guard covers the app's custom API routes.
 *
 * Returns a 403 response when the request is cross-site, otherwise null.
 */
export function rejectCrossSiteMutation(request: Request): NextResponse | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return null;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    // Browsers send Origin on state-changing requests. Allow a missing Origin
    // only outside production so local curl/tests can exercise the routes.
    return process.env.NODE_ENV === "production"
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : null;
  }

  let originValue: string;
  try {
    originValue = new URL(origin).origin;
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL;
  const allowed = new Set(PUBLIC_ORIGINS);
  if (process.env.NODE_ENV !== "production") {
    // Local development and E2E run on arbitrary loopback ports.
    try {
      const parsedOrigin = new URL(origin);
      if (
        ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
          parsedOrigin.hostname,
        )
      ) {
        allowed.add(parsedOrigin.origin);
      }
    } catch {
      // The malformed-origin branch above already returned 403.
    }
  }
  if (configuredSite) {
    try {
      allowed.add(new URL(configuredSite).origin);
    } catch {
      // Ignore a malformed public URL; the static allowlist still applies.
    }
  }

  if (!allowed.has(originValue)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (
    fetchSite &&
    fetchSite !== "same-origin" &&
    fetchSite !== "same-site" &&
    fetchSite !== "none"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}
