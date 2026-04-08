import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isCI = Boolean(process.env.CI);

function getLocalWebServerConfig() {
  try {
    const parsedUrl = new URL(baseURL);
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);

    if (!isLocalHost) {
      return undefined;
    }

    const port = parsedUrl.port || "3000";

    return {
      command: `bun run dev -- --port ${port}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    };
  } catch {
    return undefined;
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: isCI ? 1 : 0,
  outputDir: "test-results",
  reporter: isCI
    ? [
        ["github"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
        ["json", { outputFile: "test-results/playwright-results.json" }],
      ]
    : "list",

  webServer: getLocalWebServerConfig(),

  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: isCI ? "retain-on-failure" : "on-first-retry",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
