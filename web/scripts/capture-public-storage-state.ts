/**
 * Capture a reusable Playwright storage state for public Supabase email/password smoke tests.
 * Usage: bun run e2e:capture-public-state
 * Required env: E2E_PUBLIC_EMAIL, E2E_PUBLIC_PASSWORD
 * Optional env: E2E_BASE_URL, E2E_PUBLIC_STORAGE_STATE, E2E_CAPTURE_HEADLESS=0
 */

import { mkdir } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import net from "node:net";

import { chromium } from "@playwright/test";
import { config as loadDotenv } from "dotenv";

import { resolvePublicStorageStateCaptureConfig } from "../src/lib/e2e/public-storage-state-config";
import {
  assertPublicStorageStateCapturePreconditions,
  createPublicAuthArtifactFingerprint,
  createPublicStorageStateMetadata,
} from "../src/lib/e2e/public-storage-state-config";

for (const envPath of [
  path.join(process.cwd(), ".env.test.local"),
  path.join(process.cwd(), ".env.local"),
  path.join(process.cwd(), ".env"),
  path.join(path.resolve(process.cwd(), ".."), ".env.test.local"),
  path.join(path.resolve(process.cwd(), ".."), ".env.local"),
  path.join(path.resolve(process.cwd(), ".."), ".env"),
]) {
  if (fs.existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false, quiet: true });
  }
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const captureConfig = resolvePublicStorageStateCaptureConfig({
  cwd: process.cwd(),
  baseURL,
  configuredStorageStatePath: process.env.E2E_PUBLIC_STORAGE_STATE,
  allowRemoteCapture: process.env.E2E_ALLOW_REMOTE_PUBLIC_CAPTURE === "1",
});
const storageStatePath = captureConfig.storageStatePath;
const metadataPath = captureConfig.metadataPath;
const email = process.env.E2E_PUBLIC_EMAIL?.trim();
const password = process.env.E2E_PUBLIC_PASSWORD?.trim();
const publicPostSlug = process.env.E2E_PUBLIC_POST_SLUG?.trim();
const fixtureGeneratedAt = process.env.E2E_PUBLIC_FIXTURE_GENERATED_AT?.trim();
const headless = process.env.E2E_CAPTURE_HEADLESS !== "0";

async function isBaseUrlReachable(urlValue: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(urlValue);
    const port = Number(parsedUrl.port || (parsedUrl.protocol === "https:" ? "443" : "80"));

    return await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({
        host: parsedUrl.hostname,
        port,
      });

      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });

      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });

      socket.setTimeout(5_000, () => {
        socket.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  if (!email || !password) {
    throw new Error("E2E_PUBLIC_EMAIL and E2E_PUBLIC_PASSWORD must be set before capturing public storage state.");
  }

  if (!publicPostSlug || !fixtureGeneratedAt) {
    throw new Error(
      "E2E_PUBLIC_POST_SLUG and E2E_PUBLIC_FIXTURE_GENERATED_AT must be set before capturing public storage state. Run bun run seed:e2e first.",
    );
  }

  assertPublicStorageStateCapturePreconditions({
    storageStatePath,
    isExplicitStorageState: captureConfig.isExplicitStorageState,
    storageStateExists: fs.existsSync(storageStatePath),
  });

  if (!(await isBaseUrlReachable(baseURL))) {
    throw new Error(`No app server is reachable at ${baseURL}. Start the app first (for example: bun run dev).`);
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  const signInButton = page.getByRole("button", { name: "Sign in" });

  console.log(`Signing in public E2E user at ${baseURL}/login?redirectTo=/account`);

  await page.goto("/login?redirectTo=/account", { waitUntil: "domcontentloaded" });
  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  await passwordInput.waitFor({ state: "visible", timeout: 30_000 });

  await emailInput.fill(email);
  await page.waitForFunction((expectedValue) => {
    const input = document.querySelector<HTMLInputElement>("#email");
    return input?.value === expectedValue;
  }, email);

  await passwordInput.fill(password);
  await page.waitForFunction((expectedValue) => {
    const input = document.querySelector<HTMLInputElement>("#password");
    return input?.value === expectedValue;
  }, password);

  await signInButton.waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
      .find((candidate) => candidate.textContent?.trim() === "Sign in");
    return button ? !button.disabled : false;
  });

  await signInButton.click();

  await page.waitForURL((url) => url.pathname === "/account", { timeout: 30_000 });

  const accountHeading = page.getByRole("heading", { name: "Account Settings" });
  const profileHeading = page.getByRole("heading", { name: "Profile" });
  const signOutHeading = page.getByRole("heading", { name: "Sign out" });
  const loadErrorMessage = page.getByText("Failed to load profile. Please refresh.");

  const signedInState = await Promise.race([
    accountHeading.waitFor({ state: "visible", timeout: 30_000 }).then(() => "account-heading"),
    profileHeading.waitFor({ state: "visible", timeout: 30_000 }).then(() => "profile-heading"),
    signOutHeading.waitFor({ state: "visible", timeout: 30_000 }).then(() => "sign-out-heading"),
    loadErrorMessage.waitFor({ state: "visible", timeout: 30_000 }).then(() => "load-error"),
  ]);

  if (signedInState === "load-error") {
    throw new Error("Account page loaded after sign-in but profile fetch failed. Check /api/account/profile and browser auth state.");
  }

  await mkdir(path.dirname(storageStatePath), { recursive: true });
  await context.storageState({ path: storageStatePath });
  await fs.promises.writeFile(metadataPath, JSON.stringify(createPublicStorageStateMetadata({
    origin: new URL(baseURL).origin,
    fingerprint: createPublicAuthArtifactFingerprint({
      publicEmail: email,
      publicPostSlug,
      fixtureGeneratedAt,
    }),
  }), null, 2), "utf8");

  console.log(`Saved public storage state to ${storageStatePath}`);
  console.log(`Saved public storage metadata to ${metadataPath}`);

  await context.close();
  await browser.close();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Failed to capture public storage state: ${message}`);
  process.exit(1);
});
