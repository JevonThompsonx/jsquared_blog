import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

import { getEnvSource } from "@/lib/env";

/**
 * Cloudflare Access identity.
 *
 * `/admin` and `/api/admin` sit behind a Cloudflare Access application, so the
 * edge has already authenticated the request before it reaches this Worker.
 * Never trust a bare `Cf-Access-Authenticated-User-Email` header — the Worker is
 * also reachable on its own hostname, where a client could set that header
 * itself. The signed `Cf-Access-Jwt-Assertion` is the only trustworthy signal,
 * and it is verified against the team's JWKS with the application's AUD tag.
 */

export type AccessIdentity = {
  email: string;
};

type Jwks = ReturnType<typeof createRemoteJWKSet>;

let jwks: Jwks | null = null;

export function parseAllowedEmails(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAccessConfigured(
  env: NodeJS.ProcessEnv = getEnvSource(),
): boolean {
  return Boolean(env.CF_ACCESS_TEAM_DOMAIN && env.CF_ACCESS_AUD);
}

function getJwks(teamDomain: string): Jwks {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${teamDomain.replace(/\/+$/, "")}/cdn-cgi/access/certs`),
    );
  }
  return jwks;
}

export async function getAccessIdentity(
  headers: Headers,
): Promise<AccessIdentity | null> {
  const env = getEnvSource();
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;
  const audience = env.CF_ACCESS_AUD;
  const allowed = parseAllowedEmails(env.ADMIN_ALLOWED_EMAILS);

  if (!teamDomain || !audience || allowed.length === 0) {
    return null;
  }

  const token = headers.get("cf-access-jwt-assertion");
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(teamDomain), {
      issuer: teamDomain.replace(/\/+$/, ""),
      audience,
    });

    const rawEmail =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : "";
    if (!rawEmail || !allowed.includes(rawEmail)) {
      return null;
    }

    return { email: rawEmail };
  } catch {
    return null;
  }
}
