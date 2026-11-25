import {
  applyResponseHeaders,
  authkit,
  partitionAuthkitHeaders,
} from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getWorkosRequestCallbackURI, getWorkosRequestOrigin } from "@/lib/env";
import { safeRedirectPath } from "@/lib/auth/redirect";
import { LOGOUT_RETURN_COOKIE_NAME } from "@/lib/auth/workos";

const isProduction = process.env.NODE_ENV === "production";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PKCE_AUTHORIZATION_URL_HEADER = "x-workos-authorization-url";
const PKCE_STATE_HEADER = "x-workos-pkce-state";

function isPkceCookieName(name: string): boolean {
  return name === "wos-auth-verifier" || name.startsWith("wos-auth-verifier-");
}

/** Match AuthKit's handleAuthkitProxy behavior for pending, non-redirect responses. */
function stripPendingPkceCookies(headers: Headers): void {
  if (
    !headers.has(PKCE_AUTHORIZATION_URL_HEADER) ||
    !headers.has(PKCE_STATE_HEADER)
  ) {
    return;
  }

  const setCookies = headers.getSetCookie();
  if (setCookies.length === 0) return;
  headers.delete("Set-Cookie");
  for (const cookie of setCookies) {
    const separator = cookie.indexOf("=");
    const name = separator === -1 ? "" : cookie.slice(0, separator);
    if (!isPkceCookieName(name)) {
      headers.append("Set-Cookie", cookie);
    }
  }
}

function isStateChangingMethod(method: string): boolean {
  return STATE_CHANGING_METHODS.has(method);
}

function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname: string): boolean {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

/**
 * Authenticated or token-bearing surfaces must never be cached by an
 * intermediary, even if a future route-level cache rule is added.
 */
function isSensitivePath(pathname: string): boolean {
  return (
    isAdminPath(pathname) ||
    isAdminApiPath(pathname) ||
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/api/account" ||
    pathname.startsWith("/api/account/") ||
    pathname === "/bookmarks" ||
    pathname === "/api/bookmarks" ||
    pathname === "/preview" ||
    pathname.startsWith("/preview/") ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/callback" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/signup" ||
    pathname === "/api/auth/logout" ||
    pathname === "/api/auth/session" ||
    pathname === "/api/admin/session" ||
    pathname === "/settings"
  );
}

function isSameOrigin(originValue: string, requestOrigin: string): boolean {
  try {
    return new URL(originValue).origin === requestOrigin;
  } catch {
    return false;
  }
}

/**
 * Origins this request could legitimately have been addressed to. Behind the
 * Cloudflare Tunnel, `request.nextUrl.origin` can be the internal
 * `http://10.50.2.153:3000` while the browser's Origin header is
 * `https://jsquaredadventures.com`; comparing only nextUrl.origin rejects
 * every admin form submission.
 */
const PUBLIC_ORIGINS = new Set([
  "https://jsquaredadventures.com",
  "https://www.jsquaredadventures.com",
  "https://next.jsquaredadventures.com",
]);

function getRequestOrigins(request: NextRequest): string[] {
  const origins = new Set<string>(PUBLIC_ORIGINS);

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    try {
      origins.add(new URL(configuredSiteUrl).origin);
    } catch {
      // Ignore a malformed public URL; the static allowlist still applies.
    }
  }

  if (!isProduction) {
    // Local dev and unit tests: accept the host the request actually used.
    origins.add(request.nextUrl.origin);

    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",")[0]
      ?.trim();
    const forwardedProto = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const host = request.headers.get("host")?.trim();
    const protocol =
      forwardedProto ?? request.nextUrl.protocol.replace(":", "");

    if (forwardedHost) origins.add(`${protocol}://${forwardedHost}`);
    if (host) origins.add(`${protocol}://${host}`);
  }

  return [...origins];
}

function allowsFetchSite(fetchSite: string | null): boolean {
  if (!fetchSite) {
    return false;
  }

  return (
    fetchSite === "same-origin" ||
    fetchSite === "same-site" ||
    fetchSite === "none"
  );
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
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const start = Date.now();
  const pathname = request.nextUrl.pathname;
  let callbackURI: string;
  try {
    callbackURI = getWorkosRequestCallbackURI(request);
  } catch {
    const response = new NextResponse("Untrusted request host", {
      status: 400,
    });
    logRequest(request.method, pathname, response.status, start);
    return response;
  }

  if (pathname === "/") {
    const logoutReturn = request.cookies.get(LOGOUT_RETURN_COOKIE_NAME)?.value;
    if (logoutReturn !== undefined) {
      const baseURL = getWorkosRequestOrigin(request);
      const returnPath = safeRedirectPath(logoutReturn);
      const response = NextResponse.redirect(new URL(returnPath, baseURL));
      response.cookies.set(LOGOUT_RETURN_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: baseURL.startsWith("https://"),
        path: "/",
        maxAge: 0,
      });
      logRequest(request.method, pathname, response.status, start);
      return response;
    }
  }

  if (
    isStateChangingMethod(request.method) &&
    (isAdminPath(pathname) || isAdminApiPath(pathname))
  ) {
    const originHeader = request.headers.get("origin");
    const fetchSiteHeader = request.headers.get("sec-fetch-site");
    const requestOrigins = getRequestOrigins(request);
    const hasAllowedOrigin =
      originHeader !== null &&
      requestOrigins.some((origin) => isSameOrigin(originHeader, origin));
    // Browsers always send Origin on state-changing requests. `sec-fetch-site`
    // can be absent on older clients, so only reject an explicit cross-site
    // value; the Origin allowlist above remains the primary control.
    const hasAllowedFetchSite =
      fetchSiteHeader === null || allowsFetchSite(fetchSiteHeader);

    if (!hasAllowedOrigin || !hasAllowedFetchSite) {
      const forbidden = forbiddenResponse(pathname);
      logRequest(request.method, pathname, forbidden.status, start);
      return forbidden;
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // In development, allow localhost origins (covers direct access, Tailscale, etc.)
  // and ws:// for Turbopack HMR WebSocket connections.
  const devSources = isProduction
    ? []
    : [
        "http://localhost:*",
        "ws://localhost:*",
        `http://${request.nextUrl.hostname}:*`,
        `ws://${request.nextUrl.hostname}:*`,
      ];

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    ...devSources,
    "https://avatars.githubusercontent.com",
    "https://tiles.stadiamaps.com",
    "https://*.stadiamaps.com",
  ].join(" ");

  const connectSrc = [
    "'self'",
    ...devSources,
    "https://*.sentry.io",
    "https://plausible.io",
    "https://tiles.stadiamaps.com",
    "https://*.stadiamaps.com",
    "https://fonts.stadiamaps.com",
    "https://nominatim.openstreetmap.org",
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
    // style-src: nonce covers <style> from next/font + Next.js CSS injection
    // style-src-attr 'unsafe-inline' covers 63+ React style={} patterns (low risk, no code exec)
    // unsafe-inline only in dev (same conditional pattern as script-src)
    isProduction
      ? `style-src 'self' 'nonce-${nonce}'`
      : "style-src 'self' 'unsafe-inline'",
    isProduction ? "style-src-attr 'unsafe-inline'" : null,
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
    // SEC-3: report CSP violations to our first-party endpoint so the policy is
    // observable. Report-only on the directive (we still log, not enforce) until
    // we've reviewed real-world violations and can tighten safely.
    // Keep report-to (Reporting API) and report-uri (legacy, broader browser
    // support) in sync — both point at /api/csp-report.
    "report-to csp-endpoint",
    "report-uri /api/csp-report",
    isProduction ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");

  // Clone request so we can inject x-nonce for Server Components to read.
  // partitionAuthkitHeaders strips client-supplied x-workos-* values and adds
  // only the trusted session headers produced by AuthKit.
  const { headers: authkitHeaders, session } = await authkit(request, {
    redirectUri: callbackURI,
  });
  stripPendingPkceCookies(authkitHeaders);
  const { requestHeaders, responseHeaders } = partitionAuthkitHeaders(
    request,
    authkitHeaders,
  );
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applyResponseHeaders(response, responseHeaders);

  // Defense in depth: only AuthKit's response allowlist may reach the browser.
  for (const name of [...response.headers.keys()]) {
    if (name.toLowerCase().startsWith("x-workos-")) {
      response.headers.delete(name);
    }
  }

  response.headers.set("Content-Security-Policy", csp);

  // SEC-3: declare the reporting endpoint group referenced by `report-to` above.
  // The Reporting-Endpoints header is what binds the name "csp-endpoint" to a URL.
  response.headers.set("Reporting-Endpoints", 'csp-endpoint="/api/csp-report"');

  if (isSensitivePath(pathname)) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  } else if (
    (request.method === "GET" || request.method === "HEAD") &&
    !session.user &&
    !response.headers.has("Set-Cookie")
  ) {
    // Public, anonymous responses must remain revalidatable without AuthKit's
    // pending-PKCE cookie forcing a private no-store policy on every page.
    response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  }

  logRequest(request.method, pathname, response.status, start);

  return response;
}

function logRequest(
  method: string,
  pathname: string,
  status: number,
  startedAt: number,
): void {
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  // 200 means middleware passed the request through; the downstream route may
  // still return 404/500. Do not print it as the response status.
  const outcome = status === 200 ? "pass" : String(status);
  console.info(
    `[proxy] ${method} ${pathname} ${outcome} ${Date.now() - startedAt}ms`,
  );
}

// Apply to all routes except static assets and Next.js internals
export const config = {
  matcher: [
    {
      source:
        "/((?!_err|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)).*)",
    },
  ],
};
