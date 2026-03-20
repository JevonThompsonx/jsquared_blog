import { z } from "zod";

import { loadEnvironmentFiles } from "@/lib/env-loader";

loadEnvironmentFiles();

if (!process.env.NEXTAUTH_SECRET && process.env.AUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = process.env.AUTH_SECRET;
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

// Required server-side vars — the app cannot function without these.
// Optional exceptions:
//   AUTH_ADMIN_GITHUB_IDS  — can be absent (disables admin access) but not a crash
//   NEXT_PUBLIC_STADIA_MAPS_API_KEY — map degrades gracefully if unset
//   CRON_SECRET — optional in local dev; required in all deployed environments
//   UPSTASH_REDIS_REST_URL / _TOKEN — optional; without them rate limiting falls
//     back to in-process memory (not consistent across Vercel instances)
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
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  COMMENT_NOTIFICATION_TO_EMAIL: z.string().email().optional(),
  RESEND_NEWSLETTER_SEGMENT_ID: z.string().min(1).optional(),
  // Rate limiter — optional but logged as a warning when absent in non-dev environments
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  // Cron endpoint secret — optional in local dev only (enforced by the route handler)
  CRON_SECRET: z.string().min(16).optional(),
});

// NEXT_PUBLIC_ vars are embedded at build time, so they can't be validated
// at runtime in the same way. Keep them optional here; missing values show up
// as `undefined` in the client bundle if not set before `next build`.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_STADIA_MAPS_API_KEY: z.string().min(1).optional(),
  // Sentry DSN is safe to expose publicly
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

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

  // Warn (non-fatal) when Upstash is absent in a deployed environment: rate limiting
  // will fall back to in-process memory which is not consistent across instances.
  const isDeployed = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
  if (isDeployed) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.warn(
        "[env] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. " +
        "Rate limiting will use in-process memory and will NOT be consistent across instances.",
      );
    }
    if (!process.env.CRON_SECRET) {
      console.warn(
        "[env] CRON_SECRET is not set. The /api/cron/publish-scheduled endpoint will return 500.",
      );
    }
  }
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse(process.env);
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse(process.env);
}
