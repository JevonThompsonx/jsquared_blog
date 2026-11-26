import { afterEach, describe, expect, it, vi } from "vitest";

const BASE_ENV: Record<string, string> = {
  TURSO_DATABASE_URL: "file:/tmp/j2-env-production.db",
  NEXT_PUBLIC_SITE_URL: "https://jsquaredadventures.com",
  CRON_SECRET: "test-cron-secret-min-16",
  ADMIN_ALLOWED_EMAILS: "admin@example.com",
  RATE_LIMIT_DRIVER: "memory",
};

function applyProductionEnv(): void {
  for (const [key, value] of Object.entries(BASE_ENV)) {
    vi.stubEnv(key, value);
  }
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("NEXT_PHASE", "test");
}

async function importEnvModule() {
  vi.resetModules();
  vi.doMock("@/lib/env-loader", () => ({ loadEnvironmentFiles: () => {} }));
  return import("@/lib/env");
}

async function captureError(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("Expected the environment import to fail");
}

describe("production environment fail-fast", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock("@/lib/env-loader");
  });

  it("boots with a complete production configuration", async () => {
    applyProductionEnv();

    const envModule = await importEnvModule();

    expect(envModule.getServerEnv().ADMIN_ALLOWED_EMAILS).toBe(
      "admin@example.com",
    );
  });

  it("requires CRON_SECRET in production", async () => {
    applyProductionEnv();
    vi.stubEnv("CRON_SECRET", "");

    const message = await captureError(importEnvModule());

    expect(message).toMatch(/CRON_SECRET/);
    expect(message).toMatch(/required/i);
  });

  it("requires at least one admin email in production", async () => {
    applyProductionEnv();
    vi.stubEnv("ADMIN_ALLOWED_EMAILS", " , ,");

    const message = await captureError(importEnvModule());

    expect(message).toMatch(/ADMIN_ALLOWED_EMAILS/);
    expect(message).not.toContain("admin@example.com");
  });

  it("rejects an allowlist with no valid address and does not echo entries", async () => {
    applyProductionEnv();
    const invalidEntries = "not-an-email@,still-bad";
    vi.stubEnv("ADMIN_ALLOWED_EMAILS", invalidEntries);

    const message = await captureError(importEnvModule());

    expect(message).toMatch(/ADMIN_ALLOWED_EMAILS/);
    expect(message).not.toContain("not-an-email");
    expect(message).not.toContain("still-bad");
  });

  it("requires NEXT_PUBLIC_SITE_URL in production", async () => {
    applyProductionEnv();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    const message = await captureError(importEnvModule());

    expect(message).toMatch(/NEXT_PUBLIC_SITE_URL/);
    expect(message).toMatch(/required/i);
  });

  it("does not echo an invalid site URL", async () => {
    applyProductionEnv();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://internal.example:8080");

    const message = await captureError(importEnvModule());

    expect(message).toMatch(/NEXT_PUBLIC_SITE_URL/);
    expect(message).not.toContain("internal.example");
  });

  it("does not enforce production-only requirements in development", async () => {
    applyProductionEnv();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CRON_SECRET", "");
    vi.stubEnv("ADMIN_ALLOWED_EMAILS", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    await expect(importEnvModule()).resolves.toMatchObject({
      getServerEnv: expect.any(Function),
    });
  });
});

describe("isProductionDeployment", () => {
  it("treats a plain Node production runtime as production", async () => {
    const { isProductionDeployment } = await import("@/lib/runtime-env");

    expect(isProductionDeployment({ NODE_ENV: "production", VERCEL: "" })).toBe(
      true,
    );
  });

  it("does not treat a Vercel preview as production", async () => {
    const { isProductionDeployment } = await import("@/lib/runtime-env");

    expect(
      isProductionDeployment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
  });

  it("treats a Vercel production deployment as production", async () => {
    const { isProductionDeployment } = await import("@/lib/runtime-env");

    expect(
      isProductionDeployment({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "production",
      }),
    ).toBe(true);
  });
});
