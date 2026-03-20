/**
 * Capture a reusable Playwright storage state for Auth.js admin smoke tests.
 * Usage: bun run e2e:capture-admin-state
 * NOTE: This script must run under Node (via tsx), NOT Bun. Bun hangs silently on
 *       headed Playwright launches on Windows. The package.json script uses:
 *         node --import tsx/esm ./scripts/capture-admin-storage-state.ts
 * Env: E2E_BASE_URL=https://jsquaredadventures.com and/or E2E_ADMIN_STORAGE_STATE=playwright/.auth/admin.prod.json
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const storageStatePath = path.resolve(
  process.cwd(),
  process.env.E2E_ADMIN_STORAGE_STATE ?? path.join("playwright", ".auth", "admin.json"),
);
const launchTimeoutMs = parsePositiveInteger(process.env.E2E_CAPTURE_LAUNCH_TIMEOUT_MS, 300_000);
const signInTimeoutMs = parsePositiveInteger(process.env.E2E_CAPTURE_SIGNIN_TIMEOUT_MS, 600_000);

function parsePositiveInteger(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

async function launchCaptureBrowser() {
  type LaunchOptions = NonNullable<Parameters<typeof chromium.launch>[0]>;

  const launchProfiles: ReadonlyArray<{ label: string; options: LaunchOptions }> = [
    {
      label: "Playwright bundled Chromium",
      options: { headless: false, slowMo: 150, timeout: launchTimeoutMs },
    },
    {
      label: "Google Chrome channel",
      options: { headless: false, slowMo: 150, timeout: launchTimeoutMs, channel: "chrome" },
    },
    {
      label: "Microsoft Edge channel",
      options: { headless: false, slowMo: 150, timeout: launchTimeoutMs, channel: "msedge" },
    },
  ];

  const launchFailures: string[] = [];

  for (const profile of launchProfiles) {
    try {
      const browser = await chromium.launch(profile.options);
      return { browser, profileLabel: profile.label };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown launch error";
      launchFailures.push(`${profile.label}: ${message}`);
    }
  }

  throw new Error(
    [
      "Unable to launch a headed browser for admin capture.",
      ...launchFailures,
      "Try setting E2E_CAPTURE_LAUNCH_TIMEOUT_MS=600000, and ensure Chrome or Edge is installed.",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const { browser, profileLabel } = await launchCaptureBrowser();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  console.log(`Opening ${baseURL}/admin in a visible browser using ${profileLabel}...`);
  console.log("Complete the GitHub admin sign-in flow in the opened window.");
  console.log(`Sign-in timeout is ${Math.round(signInTimeoutMs / 1000)} seconds.`);

  await page.goto("/admin", { waitUntil: "domcontentloaded" });

  const signInButton = page.getByRole("button", { name: "Sign in with GitHub" });
  if (await signInButton.isVisible()) {
    await signInButton.click();
  }

  await page.getByText("Editorial workspace").waitFor({ state: "visible", timeout: signInTimeoutMs });

  await mkdir(path.dirname(storageStatePath), { recursive: true });
  await context.storageState({ path: storageStatePath });

  console.log(`Saved admin storage state to ${storageStatePath}`);

  await context.close();
  await browser.close();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Failed to capture admin storage state: ${message}`);
  process.exit(1);
});
