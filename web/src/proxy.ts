import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProduction = process.env.NODE_ENV === "production";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isStateChangingMethod(method: string): boolean {
  return STATE_CHANGING_METHODS.has(method);
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname: string): boolean {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

function isSameOrigin(originValue: string, requestOrigin: string): boolean {
  try {
    return new URL(originValue).origin === requestOrigin;
  } catch {
    return false;
  }
}

function allowsFetchSite(fetchSite: string | null): boolean {
  if (!fetchSite) {
    return false;
  }

  return fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none";
}

function forbiddenResponse(pathname: string): NextResponse {
  if (isAdminApiPath(pathname)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// 6.S.1: Generate a per-request nonce so we can remove 'unsafe-inline' from script-src.
// The nonce is set in two places:
//   1. The Content-Security-Policy response header (authorises scripts with that nonce)
//   2. The x-nonce request header (forwarded to Server Components so they can render <Script nonce>)
export function proxy(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (isStateChangingMethod(request.method) && (isAdminPath(pathname) || isAdminApiPath(pathname))) {
    const originHeader = request.headers.get("origin");
    const fetchSiteHeader = request.headers.get("sec-fetch-site");
    const hasAllowedOrigin = originHeader !== null && isSameOrigin(originHeader, request.nextUrl.origin);

    if (!hasAllowedOrigin || !allowsFetchSite(fetchSiteHeader)) {
      return forbiddenResponse(pathname);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https://res.cloudinary.com",
    "https://*.cloudinary.com",
    "https://*.supabase.co",
    "https://placehold.co",
    "https://images.unsplash.com",
    "https://imagedelivery.net",
    "https://tiles.stadiamaps.com",
    "https://*.stadiamaps.com",
  ].join(" ");

  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://*.sentry.io",
    "https://plausible.io",
    "https://tiles.stadiamaps.com",
    "https://*.stadiamaps.com",
    "https://fonts.stadiamaps.com",
    "https://nominatim.openstreetmap.org",
    // Cloudinary: required for the service worker's stale-while-revalidate fetch strategy
    "https://res.cloudinary.com",
    "https://*.cloudinary.com",
  ].join(" ");

  const csp = [
    "default-src 'self'",
    // nonce covers all legitimate inline scripts; unsafe-eval only in dev for hot reload
    // wasm-unsafe-eval is required in production for MapLibre GL 5.x (WASM-based renderer)
    [
      `script-src 'self' 'nonce-${nonce}'`,
      isProduction ? "'wasm-unsafe-eval'" : "'unsafe-eval'",
      "https://plausible.io",
    ]
      .filter(Boolean)
      .join(" "),
    "script-src-attr 'none'",
    // style-src keeps unsafe-inline: Tailwind/CSS-in-JS needs it; style nonces are a separate effort
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self' data: https://fonts.stadiamaps.com",
    `connect-src ${connectSrc}`,
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://open.spotify.com",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isProduction ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");

  // Clone request so we can inject x-nonce for Server Components to read
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);

  if (isAdminPath(pathname) || isAdminApiPath(pathname)) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  return response;
}

// Apply to all routes except static assets and Next.js internals
export const config = {
  matcher: [
    {
      source: "/((?!_err|_stats|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
