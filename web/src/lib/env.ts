import { z } from "zod";

import { loadEnvironmentFiles } from "@/lib/env-loader";
import {
  isDeployedEnvironment,
  shouldWarnAboutMissingCronSecret,
} from "@/lib/runtime-env";

export { isDeployedEnvironment } from "@/lib/runtime-env";

loadEnvironmentFiles();

/**
 * Cloudflare Workers expose Worker *secrets* on the `env` object passed to
 * `fetch`, but `process.env` is a frozen proxy populated with plain vars only.
 * `worker-entry.ts` mirrors the full binding set onto `globalThis.__RUNTIME_ENV__`
 * before the app loads; merge it over `process.env` here so every schema below
 * sees secrets without changing anything on Node/Next.js.
 */
const runtimeEnvBridge = (
  globalThis as unknown as { __RUNTIME_ENV__?: Record<string, string> }
).__RUNTIME_ENV__;

let resolvedEnv: NodeJS.ProcessEnv | null = null;

export function getEnvSource(): NodeJS.ProcessEnv {
  if (!runtimeEnvBridge) {
    return process.env;
  }

  if (resolvedEnv) {
    return resolvedEnv;
  }

  const merged: NodeJS.ProcessEnv = { ...process.env, ...runtimeEnvBridge };

  resolvedEnv = merged;
  return merged;
}

function blankStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}

function optionalTrimmedString() {
  return z.preprocess(
    blankStringToUndefined,
    z.string().trim().min(1).optional(),
  );
}

function optionalTrimmedEmail() {
  return z.preprocess(
    blankStringToUndefined,
    z.string().trim().email().optional(),
  );
}

// Required server-side vars — the app cannot function without these.
// Optional exceptions:
//   Legacy Better Auth / Auth.js vars — retained for one rollback cycle only
//   NEXT_PUBLIC_STADIA_MAPS_API_KEY — map degrades gracefully if unset
//   CRON_SECRET — optional in local dev; required in all deployed environments
//   UPSTASH_REDIS_REST_URL / _TOKEN — optional in local dev and test only;
//     deployed environments must provide them because rate limiting cannot fall
//     back to in-process memory safely
const serverEnvSchema = z.object({
  TURSO_DATABASE_URL: z
    .string()
    .trim()
    .min(1, "required")
    .refine(
      (value) => /^(file:|libsql:|https?:|wss?:)/i.test(value),
      "must be a file:, libsql:, https:, or wss: URL",
    ),
  TURSO_AUTH_TOKEN: z.preprocess(
    blankStringToUndefined,
    z.string().min(1).optional(),
  ),
  // Legacy Auth.js settings. Optional so a WorkOS-only deployment can boot;
  // the previous release can still consume them during a code rollback.
  AUTH_SECRET: z.preprocess(
    blankStringToUndefined,
    z.string().trim().min(32, "must be at least 32 characters").optional(),
  ),
  AUTH_GITHUB_ID: optionalTrimmedString(),
  AUTH_GITHUB_SECRET: optionalTrimmedString(),
  AUTH_ADMIN_GITHUB_IDS: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const ids = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const invalid = ids.filter((id) => !/^\d+$/.test(id));
      if (invalid.length > 0) {
        throw new Error(
          `AUTH_ADMIN_GITHUB_IDS contains non-numeric IDs: ${invalid.join(", ")}`,
        );
      }
      return ids.join(",");
    }),
  CLOUDINARY_CLOUD_NAME: optionalTrimmedString(),
  CLOUDINARY_API_KEY: optionalTrimmedString(),
  CLOUDINARY_API_SECRET: optionalTrimmedString(),
  LOCAL_MEDIA_ROOT: optionalTrimmedString(),
  // Better Auth falls back to AUTH_SECRET when this is unset.
  BETTER_AUTH_SECRET: z.preprocess(
    blankStringToUndefined,
    z.string().trim().min(32, "must be at least 32 characters").optional(),
  ),
  BETTER_AUTH_URL: z.preprocess(
    blankStringToUndefined,
    z.string().trim().url().optional(),
  ),
  AUTH_EMAIL_TRANSPORT: z.enum(["resend", "console"]).optional(),
  // Explicit opt-in for an HTTP loopback origin in a production-mode smoke.
  AUTH_ALLOW_LOCAL_ORIGIN: z.enum(["0", "1"]).optional(),
  RESEND_API_KEY: optionalTrimmedString(),
  RESEND_FROM_EMAIL: optionalTrimmedEmail(),
  COMMENT_NOTIFICATION_TO_EMAIL: optionalTrimmedString(),
  LISTMONK_URL: z.preprocess(
    blankStringToUndefined,
    z
      .string()
      .trim()
      .url()
      .refine((value) => value.startsWith("https://"), "must use https://")
      .optional(),
  ),
  LISTMONK_LIST_UUID: z.preprocess(
    blankStringToUndefined,
    z.string().trim().uuid("must be a UUID").optional(),
  ),
  LISTMONK_ACCESS_CLIENT_ID: optionalTrimmedString(),
  LISTMONK_ACCESS_CLIENT_SECRET: optionalTrimmedString(),
  // Local single-instance mode: use the in-process limiter. Restart resets
  // buckets, which is acceptable for a single local Node process.
  RATE_LIMIT_DRIVER: z.enum(["upstash", "memory"]).optional(),
  // Rate limiter — optional in local dev/test only
  UPSTASH_REDIS_REST_URL: z.preprocess(
    blankStringToUndefined,
    z.string().trim().url().optional(),
  ),
  UPSTASH_REDIS_REST_TOKEN: optionalTrimmedString(),
  // Cron endpoint secret — optional in local dev only (enforced by the route handler)
  CRON_SECRET: z.preprocess(
    blankStringToUndefined,
    z.string().trim().min(16).optional(),
  ),
  // Cloudflare Access — gates /admin and /api/admin at the edge.
  CF_ACCESS_TEAM_DOMAIN: optionalTrimmedString(),
  CF_ACCESS_AUD: optionalTrimmedString(),
  ADMIN_ALLOWED_EMAILS: optionalTrimmedString(),
});

// NEXT_PUBLIC_ vars are embedded at build time, so they can't be validated
// at runtime in the same way. Keep them optional here; missing values show up
// as `undefined` in the client bundle if not set before `next build`.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    blankStringToUndefined,
    z.string().trim().url().optional(),
  ),
  NEXT_PUBLIC_STADIA_MAPS_API_KEY: optionalTrimmedString(),
  // Sentry DSN is safe to expose publicly
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(
    blankStringToUndefined,
    z.string().trim().url().optional(),
  ),
});

const WORKOS_CALLBACK_ORIGINS = new Set([
  "https://jsquaredadventures.com",
  "https://www.jsquaredadventures.com",
  "https://next.jsquaredadventures.com",
  "http://localhost:3000",
]);

const workosEnvSchema = z
  .object({
    WORKOS_CLIENT_ID: z.string().trim().min(1, "required"),
    WORKOS_ISSUER: z
      .string()
      .trim()
      .url()
      .refine((value) => {
        try {
          const parsed = new URL(value);
          return (
            parsed.protocol === "https:" &&
            !parsed.search &&
            !parsed.hash &&
            parsed.username === "" &&
            parsed.password === ""
          );
        } catch {
          return false;
        }
      }, "WORKOS_ISSUER must be an HTTPS URL without credentials, query, or hash"),
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: z
      .string()
      .trim()
      .url()
      .refine((value) => {
        try {
          const parsed = new URL(value);
          return (
            WORKOS_CALLBACK_ORIGINS.has(parsed.origin) &&
            parsed.pathname === "/callback" &&
            !parsed.search &&
            !parsed.hash &&
            parsed.username === "" &&
            parsed.password === ""
          );
        } catch {
          return false;
        }
      }, "callback must be an approved public origin with pathname /callback"),
    WORKOS_COOKIE_PASSWORD: z
      .string()
      .trim()
      .min(32, "must be at least 32 characters"),
    WORKOS_COOKIE_MAX_AGE: z.preprocess((value) => {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return undefined;
      }
      return Number(value);
    }, z.number().int().positive().max(31_536_000)),
    WORKOS_API_KEY: optionalTrimmedString(),
    WORKOS_COOKIE_DOMAIN: optionalTrimmedString(),
    WORKOS_COOKIE_NAME: optionalTrimmedString(),
    WORKOS_COOKIE_SAMESITE: optionalTrimmedString(),
  })
  .superRefine((env, context) => {
    if (env.WORKOS_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["WORKOS_API_KEY"],
        message:
          "WorkOS AuthKit runs keyless; remove WORKOS_API_KEY from the app environment",
      });
    }
    if (env.WORKOS_COOKIE_DOMAIN) {
      context.addIssue({
        code: "custom",
        path: ["WORKOS_COOKIE_DOMAIN"],
        message:
          "WorkOS sessions must be host-scoped; remove WORKOS_COOKIE_DOMAIN",
      });
    }
    if (env.WORKOS_COOKIE_NAME && env.WORKOS_COOKIE_NAME !== "wos-session") {
      context.addIssue({
        code: "custom",
        path: ["WORKOS_COOKIE_NAME"],
        message: "WorkOS session cookie name must be wos-session",
      });
    }
    if (
      env.WORKOS_COOKIE_SAMESITE &&
      env.WORKOS_COOKIE_SAMESITE.toLowerCase() !== "lax"
    ) {
      context.addIssue({
        code: "custom",
        path: ["WORKOS_COOKIE_SAMESITE"],
        message: "WorkOS session cookie SameSite must be Lax",
      });
    }
  })
  .transform((env) => ({
    clientId: env.WORKOS_CLIENT_ID,
    issuer: env.WORKOS_ISSUER,
    redirectUri: env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
    cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    cookieMaxAge: env.WORKOS_COOKIE_MAX_AGE,
  }));

const databaseEnvSchema = serverEnvSchema.pick({
  TURSO_DATABASE_URL: true,
  TURSO_AUTH_TOKEN: true,
});

const cloudinaryEnvSchema = serverEnvSchema.pick({
  CLOUDINARY_CLOUD_NAME: true,
  CLOUDINARY_API_KEY: true,
  CLOUDINARY_API_SECRET: true,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type CloudinaryEnv = z.infer<typeof cloudinaryEnvSchema>;
export type WorkosEnv = z.infer<typeof workosEnvSchema>;

let cachedWorkosEnv: WorkosEnv | null = null;

function hasNonEmptyValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasUpstashRedisCredentials(
  env: NodeJS.ProcessEnv = getEnvSource(),
): boolean {
  return (
    hasNonEmptyValue(env.UPSTASH_REDIS_REST_URL) &&
    hasNonEmptyValue(env.UPSTASH_REDIS_REST_TOKEN)
  );
}

function assertRateLimitConfiguration(
  env: NodeJS.ProcessEnv = getEnvSource(),
): void {
  if (
    isDeployedEnvironment(env) &&
    env.RATE_LIMIT_DRIVER !== "memory" &&
    !hasUpstashRedisCredentials(env)
  ) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in deployed environments because rate limiting cannot fall back to in-process memory.",
    );
  }
}

function assertPublicSiteConfiguration(
  env: NodeJS.ProcessEnv = getEnvSource(),
): void {
  if (!isDeployedEnvironment(env) || !env.NEXT_PUBLIC_SITE_URL?.trim()) return;

  let parsed: URL;
  try {
    parsed = new URL(env.NEXT_PUBLIC_SITE_URL);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid public HTTPS URL");
  }
  const loopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    parsed.hostname,
  );
  if (parsed.protocol !== "https:" || loopback) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must use HTTPS and a non-loopback host in deployed environments",
    );
  }
}

// Validate all required server vars at module load time.
// Next.js sets NEXT_PHASE="phase-production-build" during `next build` static
// analysis — skip validation then since runtime env vars may not be present.
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!isNextBuild) {
  const result = serverEnvSchema.safeParse(getEnvSource());
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  ${String(issue.path[0])}: ${issue.message}`,
    );
    throw new Error(
      [
        "",
        "Missing or invalid environment variables:",
        ...lines,
        "",
        "Check web/.env.local (local dev) or your deployment environment variables.",
        "",
      ].join("\n"),
    );
  }

  cachedWorkosEnv = workosEnvSchema.parse(getEnvSource());
  assertRateLimitConfiguration(getEnvSource());
  assertPublicSiteConfiguration(getEnvSource());

  if (shouldWarnAboutMissingCronSecret(getEnvSource())) {
    console.warn(
      "[env] CRON_SECRET is not set. Cron endpoints such as /api/cron/publish-scheduled will return 500.",
    );
  }
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse(getEnvSource());
}

export function getWorkosEnv(): WorkosEnv {
  if (!cachedWorkosEnv) {
    cachedWorkosEnv = workosEnvSchema.parse(getEnvSource());
  }
  return cachedWorkosEnv;
}

export function resetWorkosEnvForTests(): void {
  cachedWorkosEnv = null;
}

const APPROVED_CALLBACK_BY_HOST = new Map([
  ["jsquaredadventures.com", "https://jsquaredadventures.com/callback"],
  ["www.jsquaredadventures.com", "https://www.jsquaredadventures.com/callback"],
  [
    "next.jsquaredadventures.com",
    "https://next.jsquaredadventures.com/callback",
  ],
  ["localhost:3000", "http://localhost:3000/callback"],
]);

/** Resolve only an approved browser-facing callback for this request. */
export function getWorkosRequestCallbackURI(request: Request): string {
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = (forwardedHost || request.headers.get("host") || "")
    .trim()
    .toLowerCase();
  if (!host) return getWorkosEnv().redirectUri;

  const approved = APPROVED_CALLBACK_BY_HOST.get(host);
  if (approved) return approved;

  if (/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) {
    return "http://localhost:3000/callback";
  }

  throw new Error("Untrusted WorkOS request host");
}

export function getWorkosRequestOrigin(request: Request): string {
  return new URL(getWorkosRequestCallbackURI(request)).origin;
}

export function getDatabaseEnv(): DatabaseEnv {
  return databaseEnvSchema.parse(getEnvSource());
}

export function getCloudinaryEnv(): CloudinaryEnv {
  return cloudinaryEnvSchema.parse(getEnvSource());
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse(getEnvSource());
}
