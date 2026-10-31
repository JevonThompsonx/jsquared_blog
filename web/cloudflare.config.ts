import { bindings, defineConfig, defineWorker } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";

const cache = await createWorkersCacheConfig();

const isProductionPreview =
  process.env.CLOUDFLARE_WORKER_NAME === "jsquared-blog" ||
  process.env.CLOUDFLARE_ENV === "production";

const workerName = process.env.CLOUDFLARE_WORKER_NAME ?? "jsquared-blog";

const siteUrl =
  process.env.NEXTAUTH_URL ??
  (workerName === "jsquared-blog"
    ? "https://jsquaredadventures.com"
    : "https://jsquared-blog-preview.servicesorsubscriptions-natural894.workers.dev");

/**
 * Runtime configuration.
 *
 * Everything the app reads from `process.env` at runtime is uploaded as a
 * Worker **secret** by `scripts/deploy-cloudflare.mjs` *after* the code
 * deploy. `cf deploy` rewrites the binding list, so secrets are always
 * re-applied immediately after every deploy — never store them as plain text
 * bindings, which would be readable in the dashboard and in deploy output.
 *
 * `env` here holds only non-secret bindings.
 */
export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: workerName,
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
      NEXTAUTH_URL: bindings.text(siteUrl),
      NEXT_PUBLIC_SITE_URL: bindings.text(siteUrl),
      ...(isProductionPreview ? {} : {}),
    },
  }),
});
