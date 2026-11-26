import { defineConfig, devices } from "@playwright/test";

import { loadPlaywrightEnv } from "./playwright-env";
import {
  DEFAULT_E2E_BASE_URL,
  resolveE2EBaseURL,
} from "./src/lib/e2e/base-url";

const baseURL = resolveE2EBaseURL(process.env.E2E_BASE_URL);
const isCI = Boolean(process.env.CI);
const webServerEnv = loadPlaywrightEnv();

function getLocalWebServerConfig() {
  try {
    const parsedUrl = new URL(baseURL);
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(
      parsedUrl.hostname,
    );

    if (!isLocalHost) {
      return undefined;
    }

    const port =
      parsedUrl.port ||
      (baseURL === DEFAULT_E2E_BASE_URL
        ? "3100"
        : parsedUrl.protocol === "https:"
          ? "443"
          : "80");

    return {
      // Pass `--port` as a flag to `next dev`, NOT as a positional arg after a
      // `--` separator. `next dev -- <port>` treats `<port>` as the project
      // directory and fails with "Invalid project directory provided".
      command: `pnpm run dev --port ${port}`,
      env: webServerEnv,
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
