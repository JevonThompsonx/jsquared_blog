import { afterEach, describe, expect, it, vi } from "vitest";

const REQUIRED_SERVER_ENV: Record<string, string> = {
  TURSO_DATABASE_URL: "https://example-db.turso.io",
  TURSO_AUTH_TOKEN: "turso-token",
  AUTH_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
  AUTH_GITHUB_ID: "github-client-id",
  AUTH_GITHUB_SECRET: "github-client-secret",
  CLOUDINARY_CLOUD_NAME: "cloud-name",
  CLOUDINARY_API_KEY: "cloudinary-key",
  CLOUDINARY_API_SECRET: "cloudinary-secret",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "supabase-anon-key",
};

async function importRateLimitModule() {
  vi.resetModules();
  return import("@/lib/rate-limit");
}

function applyBaseEnv(): void {
  for (const [key, value] of Object.entries(REQUIRED_SERVER_ENV)) {
    vi.stubEnv(key, value);
  }

  vi.stubEnv("NEXT_PHASE", "test");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("VERCEL", "");

  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.CRON_SECRET;
}

describe("checkRateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses in-memory fallback in test and local-dev style environments", async () => {
    applyBaseEnv();

    const { checkRateLimit } = await importRateLimitModule();

    const first = await checkRateLimit("comments:127.0.0.1", 2, 60_000);
    const second = await checkRateLimit("comments:127.0.0.1", 2, 60_000);
    const third = await checkRateLimit("comments:127.0.0.1", 2, 60_000);

    expect(first).toMatchObject({ allowed: true, limit: 2, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, limit: 2, remaining: 0 });
    expect(third).toMatchObject({ allowed: false, limit: 2, remaining: 0 });
  });

  it("fails closed in deployed environments when Upstash credentials are missing", async () => {
    applyBaseEnv();
    vi.stubEnv("NODE_ENV", "production");

    await expect(importRateLimitModule()).rejects.toThrow(
      /UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in deployed environments/i,
    );
  });

  it("treats Vercel deployments without Upstash as invalid even when NODE_ENV is not production", async () => {
    applyBaseEnv();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");

    await expect(importRateLimitModule()).rejects.toThrow(
      /UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in deployed environments/i,
    );
  });
});
