import { afterEach, describe, expect, it, vi } from "vitest";

const WORKOS_ENV_KEYS = [
  "WORKOS_CLIENT_ID",
  "WORKOS_ISSUER",
  "NEXT_PUBLIC_WORKOS_REDIRECT_URI",
  "WORKOS_COOKIE_PASSWORD",
  "WORKOS_COOKIE_MAX_AGE",
] as const;

function clearWorkosEnv() {
  for (const key of WORKOS_ENV_KEYS) vi.stubEnv(key, undefined);
}

async function importConfigModule() {
  vi.resetModules();
  return import("../../playwright.config");
}

describe("playwright config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses the list reporter outside CI", async () => {
    vi.stubEnv("CI", "");

    const { default: config } = await importConfigModule();

    expect(config.reporter).toBe("list");
  }, 15_000);

  it("emits durable CI diagnostics artifacts", async () => {
    vi.stubEnv("CI", "1");

    const { default: config } = await importConfigModule();

    expect(config.reporter).toEqual([
      ["github"],
      ["html", { open: "never", outputFolder: "playwright-report" }],
      ["json", { outputFile: "test-results/playwright-results.json" }],
    ]);
    expect(config.outputDir).toBe("test-results");
    expect(config.use?.trace).toBe("retain-on-failure");
    expect(config.use?.video).toBe("off");
    expect(config.use?.screenshot).toBe("only-on-failure");
  }, 15_000);

  it("starts a managed dev server only for localhost targets", async () => {
    vi.stubEnv("E2E_BASE_URL", "http://localhost:4123");
    vi.stubEnv("CI", "");
    clearWorkosEnv();

    const { default: config } = await importConfigModule();

    expect(config.webServer).toEqual(
      expect.objectContaining({
        command: "pnpm run dev --port 4123",
        env: expect.objectContaining({
          WORKOS_CLIENT_ID: "client_test_dummy",
          WORKOS_ISSUER:
            "https://auth.example.test/user_management/client_test_dummy",
          NEXT_PUBLIC_WORKOS_REDIRECT_URI:
            "https://jsquaredadventures.com/callback",
          WORKOS_COOKIE_PASSWORD: "test-cookie-password-at-least-32-characters",
          WORKOS_COOKIE_MAX_AGE: "1209600",
        }),
        url: "http://localhost:4123",
        reuseExistingServer: true,
        timeout: 120_000,
      }),
    );
  }, 15_000);

  it("preserves explicit WorkOS env overrides for the managed server", async () => {
    vi.stubEnv("E2E_BASE_URL", "http://localhost:4123");
    vi.stubEnv("CI", "");
    clearWorkosEnv();
    vi.stubEnv("WORKOS_CLIENT_ID", "client_override");

    const { default: config } = await importConfigModule();

    expect(config.webServer).toEqual(
      expect.objectContaining({
        env: expect.objectContaining({ WORKOS_CLIENT_ID: "client_override" }),
      }),
    );
  }, 15_000);

  it("does not start a managed dev server for remote targets", async () => {
    vi.stubEnv("E2E_BASE_URL", "https://staging.example.com");
    vi.stubEnv("CI", "");

    const { default: config } = await importConfigModule();

    expect(config.webServer).toBeUndefined();
  }, 15_000);
});
