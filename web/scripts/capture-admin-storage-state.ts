/**
 * Capture a reusable Playwright storage state for Auth.js admin smoke tests.
 * Usage: bun run e2e:capture-admin-state
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

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  console.log(`Opening ${baseURL}/admin in a visible browser...`);
  console.log("Complete the GitHub admin sign-in flow in the opened window.");

  await page.goto("/admin", { waitUntil: "domcontentloaded" });

  const signInButton = page.getByRole("button", { name: "Sign in with GitHub" });
  if (await signInButton.isVisible()) {
    await signInButton.click();
  }

  await page.getByText("Editorial workspace").waitFor({ state: "visible", timeout: 300_000 });

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
