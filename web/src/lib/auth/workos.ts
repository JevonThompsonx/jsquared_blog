import "server-only";

import { getSignInUrl, getSignUpUrl } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";

import { safeRedirectPath } from "@/lib/auth/redirect";
import { checkRateLimit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { getWorkosRequestCallbackURI, getWorkosRequestOrigin } from "@/lib/env";

export const LOGOUT_RETURN_COOKIE_NAME = "j2-auth-return";

export async function enforceAuthRateLimit(
  request: Request,
  bucket: "auth-login" | "auth-signup" | "auth-callback",
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(
    `${bucket}:${getClientIp(request)}`,
    limit,
    windowMs,
  );
  return result.allowed ? null : tooManyRequests(result);
}

export function parseAllowedEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function parseAuthMaxAge(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) return undefined;
  return Math.min(value, 86_400);
}

export function getAuthReturnPath(request: Request, fallback = "/"): string {
  const url = new URL(request.url);
  const rawReturnPath =
    url.searchParams.get("returnTo") ?? url.searchParams.get("redirectTo");
  return rawReturnPath ? safeRedirectPath(rawReturnPath) : fallback;
}

export function getWorkosLogoutTarget(request: Request): {
  returnPath: string;
  workosReturnTo: string;
  cookieOptions: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
} {
  const url = new URL(request.url);
  const returnPath = safeRedirectPath(url.searchParams.get("returnTo"));
  const baseURL = getWorkosRequestOrigin(request);
  return {
    returnPath,
    // WorkOS only accepts configured sign-out URIs. The staging dashboard has
    // the four roots, so the proxy restores any safe subpath after this return.
    workosReturnTo: new URL("/", baseURL).toString(),
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: baseURL.startsWith("https://"),
      path: "/",
      maxAge: 300,
    },
  };
}

export async function initiateWorkosAuth(
  request: Request,
  screen: "sign-in" | "sign-up",
  options: { maxAge?: number } = {},
): Promise<NextResponse> {
  let redirectUri: string;
  try {
    redirectUri = getWorkosRequestCallbackURI(request);
  } catch {
    return NextResponse.json(
      { error: "Untrusted request host" },
      { status: 400 },
    );
  }
  const returnTo = getAuthReturnPath(
    request,
    screen === "sign-up" ? "/account" : "/",
  );
  const authOptions = {
    returnTo,
    redirectUri,
    ...(options.maxAge !== undefined ? { maxAge: options.maxAge } : {}),
  };
  const authorizationUrl =
    screen === "sign-up"
      ? await getSignUpUrl(authOptions)
      : await getSignInUrl(authOptions);

  return NextResponse.redirect(authorizationUrl);
}
