import { describe, expect, it } from "vitest";

import { isServiceWorkerCacheablePath } from "@/lib/pwa-cache";

describe("service worker asset caching", () => {
  it("does not cache Next.js static chunks", () => {
    expect(isServiceWorkerCacheablePath("/_next/static/chunks/app.js")).toBe(false);
    expect(isServiceWorkerCacheablePath("/_next/static/chunks/[turbopack]_browser_dev_hmr-client.js")).toBe(false);
  });

  it("continues caching non-Next static assets", () => {
    expect(isServiceWorkerCacheablePath("/icons/icon-512.png")).toBe(true);
    expect(isServiceWorkerCacheablePath("/styles/app.css")).toBe(true);
  });
});
