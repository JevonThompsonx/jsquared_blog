import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

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
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  webServer: getLocalWebServerConfig(),

  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
