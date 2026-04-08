import { afterEach, describe, expect, it, vi } from "vitest";

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
  });

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
  });

  it("starts a managed dev server only for localhost targets", async () => {
    vi.stubEnv("E2E_BASE_URL", "http://localhost:4123");

    const { default: config } = await importConfigModule();

    expect(config.webServer).toEqual({
      command: "bun run dev -- --port 4123",
      url: "http://localhost:4123",
      reuseExistingServer: true,
      timeout: 120_000,
    });
  });

  it("does not start a managed dev server for remote targets", async () => {
    vi.stubEnv("E2E_BASE_URL", "https://staging.example.com");

    const { default: config } = await importConfigModule();

    expect(config.webServer).toBeUndefined();
  });
});
