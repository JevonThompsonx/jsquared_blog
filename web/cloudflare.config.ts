import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";

const cache = await createWorkersCacheConfig();

// Preview-only bridge: the app reads `process.env`, and the current
// vinext/cf Worker build does not expose Worker *secrets* to the RSC
// environment. Text bindings are exposed reliably. These values are read from
// the deploying process (never committed) and are visible in the Worker
// dashboard, so treat this as a preview workaround — production should move
// back to `bindings.secret()` once the runtime populates secrets correctly.
const runtimeKeys = [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "AUTH_SECRET",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "AUTH_ADMIN_GITHUB_IDS",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_NEWSLETTER_SEGMENT_ID",
  "COMMENT_NOTIFICATION_TO_EMAIL",
  "CRON_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_STADIA_MAPS_API_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const;

const runtimeEnv = Object.fromEntries(
  runtimeKeys.map((key) => [key, bindings.text(process.env[key] ?? "")]),
);

const previewSiteUrl =
  process.env.NEXTAUTH_URL ??
  "https://jsquared-blog-preview.servicesorsubscriptions-natural894.workers.dev";

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: "jsquared-blog-preview",
    entrypoint: "./worker-entry.ts",
    compatibilityDate: "2026-10-30",
    compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
      NEXTAUTH_URL: bindings.text(previewSiteUrl),
      ...runtimeEnv,
    },
  }),
});
