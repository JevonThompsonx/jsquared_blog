/**
 * Capture a reusable Playwright storage state for public Supabase email/password smoke tests.
 * Usage: bun run e2e:capture-public-state
 * Required env: E2E_PUBLIC_EMAIL, E2E_PUBLIC_PASSWORD
 * Optional env: E2E_BASE_URL, E2E_PUBLIC_STORAGE_STATE, E2E_CAPTURE_HEADLESS=0
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "@playwright/test";

import { loadEnvironmentFiles } from "../src/lib/env-loader";

loadEnvironmentFiles();

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const storageStatePath = path.resolve(
  process.cwd(),
  process.env.E2E_PUBLIC_STORAGE_STATE ?? path.join("playwright", ".auth", "public.json"),
);
const email = process.env.E2E_PUBLIC_EMAIL?.trim();
const password = process.env.E2E_PUBLIC_PASSWORD?.trim();
const headless = process.env.E2E_CAPTURE_HEADLESS !== "0";

async function main(): Promise<void> {
  if (!email || !password) {
    throw new Error("E2E_PUBLIC_EMAIL and E2E_PUBLIC_PASSWORD must be set before capturing public storage state.");
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  console.log(`Signing in public E2E user at ${baseURL}/login?redirectTo=/account`);

  await page.goto("/login?redirectTo=/account", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL((url) => url.pathname === "/account", { timeout: 30_000 });
  await page.getByRole("heading", { name: "Account Settings" }).waitFor({ state: "visible", timeout: 30_000 });

  await mkdir(path.dirname(storageStatePath), { recursive: true });
  await context.storageState({ path: storageStatePath });

  console.log(`Saved public storage state to ${storageStatePath}`);

  await context.close();
  await browser.close();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Failed to capture public storage state: ${message}`);
  process.exit(1);
});
