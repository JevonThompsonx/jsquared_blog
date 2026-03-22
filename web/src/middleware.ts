import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

// 6.S.1: Generate a per-request nonce so we can remove 'unsafe-inline' from script-src.
// The nonce is set in two places:
//   1. The Content-Security-Policy response header (authorises scripts with that nonce)
//   2. The x-nonce request header (forwarded to Server Components so they can render <Script nonce>)
export function middleware(request: NextRequest): NextResponse {
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
    "https://o*.ingest.sentry.io",
    "https://plausible.io",
    "https://tiles.stadiamaps.com",
    "https://*.stadiamaps.com",
    "https://fonts.stadiamaps.com",
  ].join(" ");

  const csp = [
    "default-src 'self'",
    // nonce covers all legitimate inline scripts; unsafe-eval only in dev for hot reload
    [
      `script-src 'self' 'nonce-${nonce}'`,
      isProduction ? "" : "'unsafe-eval'",
      "https://plausible.io",
    ]
      .filter(Boolean)
      .join(" "),
    // style-src keeps unsafe-inline: Tailwind/CSS-in-JS needs it; style nonces are a separate effort
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src 'self' data: https://fonts.stadiamaps.com",
    `connect-src ${connectSrc}`,
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
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

  return response;
}

// Apply to all routes except static assets and Next.js internals
export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
