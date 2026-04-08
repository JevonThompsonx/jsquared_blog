import { z } from "zod";

import { loadEnvironmentFiles } from "@/lib/env-loader";
import { isDeployedEnvironment, shouldWarnAboutMissingCronSecret } from "@/lib/runtime-env";

export { isDeployedEnvironment } from "@/lib/runtime-env";

loadEnvironmentFiles();

if (!process.env.NEXTAUTH_SECRET && process.env.AUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET;
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function blankStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length === 0 ? undefined : trimmedValue;
}

function optionalTrimmedString() {
  return z.preprocess(blankStringToUndefined, z.string().trim().min(1).optional());
}

function optionalTrimmedEmail() {
  return z.preprocess(blankStringToUndefined, z.string().trim().email().optional());
}

// Required server-side vars — the app cannot function without these.
// Optional exceptions:
//   AUTH_ADMIN_GITHUB_IDS  — can be absent (disables admin access) but not a crash
//   NEXT_PUBLIC_STADIA_MAPS_API_KEY — map degrades gracefully if unset
//   CRON_SECRET — optional in local dev; required in all deployed environments
//   UPSTASH_REDIS_REST_URL / _TOKEN — optional in local dev and test only;
//     deployed environments must provide them because rate limiting cannot fall
//     back to in-process memory safely
const serverEnvSchema = z.object({
  TURSO_DATABASE_URL: z.string().url("must be a valid libsql:// or https:// URL"),
  TURSO_AUTH_TOKEN: z.string().min(1, "required"),
  AUTH_SECRET: z.string().min(32, "must be at least 32 characters (run: openssl rand -base64 32)"),
  AUTH_GITHUB_ID: z.string().min(1, "required"),
  AUTH_GITHUB_SECRET: z.string().min(1, "required"),
  AUTH_ADMIN_GITHUB_IDS: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "required"),
  CLOUDINARY_API_KEY: z.string().min(1, "required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "required"),
  SUPABASE_URL: z.string().url("must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "required"),
  RESEND_API_KEY: optionalTrimmedString(),
  RESEND_FROM_EMAIL: optionalTrimmedEmail(),
  COMMENT_NOTIFICATION_TO_EMAIL: optionalTrimmedString(),
  RESEND_NEWSLETTER_SEGMENT_ID: optionalTrimmedString(),
  // Rate limiter — optional in local dev/test only
  UPSTASH_REDIS_REST_URL: z.preprocess(blankStringToUndefined, z.string().trim().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: optionalTrimmedString(),
  // Cron endpoint secret — optional in local dev only (enforced by the route handler)
  CRON_SECRET: z.preprocess(blankStringToUndefined, z.string().trim().min(16).optional()),
});

// NEXT_PUBLIC_ vars are embedded at build time, so they can't be validated
// at runtime in the same way. Keep them optional here; missing values show up
// as `undefined` in the client bundle if not set before `next build`.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.preprocess(blankStringToUndefined, z.string().trim().url().optional()),
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(blankStringToUndefined, z.string().trim().url().optional()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalTrimmedString(),
  NEXT_PUBLIC_STADIA_MAPS_API_KEY: optionalTrimmedString(),
  // Sentry DSN is safe to expose publicly
  NEXT_PUBLIC_SENTRY_DSN: z.preprocess(blankStringToUndefined, z.string().trim().url().optional()),
});

const databaseEnvSchema = serverEnvSchema.pick({
  TURSO_DATABASE_URL: true,
  TURSO_AUTH_TOKEN: true,
});

const supabaseServerEnvSchema = serverEnvSchema.pick({
  SUPABASE_URL: true,
  SUPABASE_ANON_KEY: true,
});

const cloudinaryEnvSchema = serverEnvSchema.pick({
  CLOUDINARY_CLOUD_NAME: true,
  CLOUDINARY_API_KEY: true,
  CLOUDINARY_API_SECRET: true,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type SupabaseServerEnv = z.infer<typeof supabaseServerEnvSchema>;
export type CloudinaryEnv = z.infer<typeof cloudinaryEnvSchema>;

function hasNonEmptyValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasUpstashRedisCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  return hasNonEmptyValue(env.UPSTASH_REDIS_REST_URL) && hasNonEmptyValue(env.UPSTASH_REDIS_REST_TOKEN);
}

function assertRateLimitConfiguration(env: NodeJS.ProcessEnv = process.env): void {
  if (isDeployedEnvironment(env) && !hasUpstashRedisCredentials(env)) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in deployed environments because rate limiting cannot fall back to in-process memory.",
    );
  }
}

// Validate all required server vars at module load time.
// Next.js sets NEXT_PHASE="phase-production-build" during `next build` static
// analysis — skip validation then since runtime env vars may not be present.
const isNextBuild = process.env.NEXT_PHASE === "phase-production-build";

if (!isNextBuild) {
  const result = serverEnvSchema.safeParse(process.env);
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

  assertRateLimitConfiguration(process.env);

  if (shouldWarnAboutMissingCronSecret(process.env)) {
    console.warn(
      "[env] CRON_SECRET is not set. Cron endpoints such as /api/cron/publish-scheduled and /api/cron/keep-supabase-awake will return 500.",
    );
  }
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env);
}

export function getDatabaseEnv(): DatabaseEnv {
  return databaseEnvSchema.parse(process.env);
}

export function getSupabaseServerEnv(): SupabaseServerEnv {
  return supabaseServerEnvSchema.parse(process.env);
}

export function getCloudinaryEnv(): CloudinaryEnv {
  return cloudinaryEnvSchema.parse(process.env);
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse(process.env);
}
