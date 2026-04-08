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

async function importEnvModule() {
  vi.resetModules();
  vi.doMock("@/lib/env-loader", () => ({
    loadEnvironmentFiles: () => {},
  }));
  return import("@/lib/env");
}

async function importRateLimitModule() {
  vi.resetModules();
  vi.doMock("@/lib/env-loader", () => ({
    loadEnvironmentFiles: () => {},
  }));
  return import("@/lib/rate-limit");
}

function applyBaseEnv(): void {
  for (const [key, value] of Object.entries(REQUIRED_SERVER_ENV)) {
    vi.stubEnv(key, value);
  }

  vi.stubEnv("NEXT_PHASE", "test");
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("VERCEL", "");
}

describe("runtime env validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("treats blank optional env vars as unset during local runtime validation", async () => {
    applyBaseEnv();
    vi.stubEnv("COMMENT_NOTIFICATION_TO_EMAIL", "");
    vi.stubEnv("RESEND_NEWSLETTER_SEGMENT_ID", "");
    vi.stubEnv("CRON_SECRET", "");

    await expect(importEnvModule()).resolves.toMatchObject({
      getServerEnv: expect.any(Function),
    });
  });

  it("does not crash local runtime validation when comment notification email is invalid", async () => {
    applyBaseEnv();
    vi.stubEnv("COMMENT_NOTIFICATION_TO_EMAIL", "not-an-email");

    await expect(importEnvModule()).resolves.toMatchObject({
      getServerEnv: expect.any(Function),
    });
  });

  it("allows database-only env access during build analysis when unrelated optional env is invalid", async () => {
    applyBaseEnv();
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("COMMENT_NOTIFICATION_TO_EMAIL", "not-an-email");

    const envModule = await importEnvModule();

    expect(envModule.getDatabaseEnv()).toMatchObject({
      TURSO_DATABASE_URL: REQUIRED_SERVER_ENV.TURSO_DATABASE_URL,
      TURSO_AUTH_TOKEN: REQUIRED_SERVER_ENV.TURSO_AUTH_TOKEN,
    });
  });

  it("still fails database-only env access when required Turso env is invalid", async () => {
    applyBaseEnv();
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    vi.stubEnv("TURSO_DATABASE_URL", "");

    const envModule = await importEnvModule();

    expect(() => envModule.getDatabaseEnv()).toThrow(/TURSO_DATABASE_URL/i);
  });

  it("treats blank optional public env vars as unset when reading public config", async () => {
    applyBaseEnv();
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");

    const envModule = await importEnvModule();

    expect(envModule.getPublicEnv()).toMatchObject({
      NEXT_PUBLIC_SENTRY_DSN: undefined,
    });
  });

  it("fails closed in deployed environments when Upstash credentials are whitespace only", async () => {
    applyBaseEnv();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "   ");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "   ");

    await expect(importRateLimitModule()).rejects.toThrow(
      /UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in deployed environments/i,
    );
  });
});
