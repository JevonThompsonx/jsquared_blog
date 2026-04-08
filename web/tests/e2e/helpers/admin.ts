import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { expect, test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

import { getAdminStorageStateMetadataPath, isAdminStorageStateMetadata } from "@/lib/e2e/admin-storage-state-config";
import { getStorageStateHint, resolveExistingStorageStatePath } from "@/lib/e2e/storage-state-helper";
import { loadEnvironmentFiles } from "../../../src/lib/env-loader";

loadEnvironmentFiles();

const defaultAdminStorageStatePath = path.resolve(process.cwd(), "playwright", ".auth", "admin.json");
const configuredBaseUrl = process.env.E2E_BASE_URL?.trim() || "http://localhost:3000";

function isLocalTarget(urlValue: string): boolean {
  try {
    const parsedUrl = new URL(urlValue);
    return ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
  } catch {
    return false;
  }
}

function parseAdminStorageStateMetadata(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isAdminStorageStateMetadata(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function hasMatchingAdminStorageStateOrigin(storageStatePath: string): boolean {
  try {
    const metadata = parseAdminStorageStateMetadata(readFileSync(getAdminStorageStateMetadataPath(storageStatePath), "utf8"));
    return metadata?.origin === new URL(configuredBaseUrl).origin;
  } catch {
    return false;
  }
}

function resolveAdminStorageStatePath(): string | null {
  const resolvedPath = resolveExistingStorageStatePath({
    configuredPath: process.env.E2E_ADMIN_STORAGE_STATE,
    defaultPath: defaultAdminStorageStatePath,
    hasStorageState: existsSync,
  });

  if (!resolvedPath) {
    return null;
  }

  if (isLocalTarget(configuredBaseUrl)) {
    return resolvedPath;
  }

  return hasMatchingAdminStorageStateOrigin(resolvedPath) ? resolvedPath : null;
}

export const configuredAdminPostId = process.env.E2E_ADMIN_POST_ID?.trim() || null;
export const adminStorageStatePath = resolveAdminStorageStatePath();
export const hasAdminStorageState = adminStorageStatePath !== null;
export const canRunAdminMutationFlows = isLocalTarget(configuredBaseUrl) || process.env.E2E_ALLOW_REMOTE_ADMIN_MUTATIONS === "1";
export const adminTest = base;

if (adminStorageStatePath) {
  adminTest.use({ storageState: adminStorageStatePath });
}

export function getAdminStorageStateHint(): string {
  return getStorageStateHint({
    command: "bun run e2e:capture-admin-state",
    label: "playwright/.auth/admin.json",
  });
}

export function getAdminMutationHint(): string {
  return "Mutation-heavy admin smoke tests run automatically on localhost and require E2E_ALLOW_REMOTE_ADMIN_MUTATIONS=1 for remote targets.";
}

export async function selectThemeOption(page: Page, ariaLabel: string, optionText: string): Promise<void> {
  await page.getByLabel(ariaLabel).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

export async function openAdminCommentsPage(page: Page): Promise<string | null> {
  if (configuredAdminPostId) {
    await page.goto(`/admin/posts/${configuredAdminPostId}/comments`);
    await page.waitForURL((url) => url.pathname === `/admin/posts/${configuredAdminPostId}/comments`, { timeout: 15_000 });
    return configuredAdminPostId;
  }

  await page.goto("/admin");

  const postRows = page.getByTestId("admin-post-row");
  await expect(postRows.first()).toBeVisible({ timeout: 15_000 });

  const moderateLink = postRows.first().getByRole("link", { name: "Moderate comments" });
  const href = await moderateLink.getAttribute("href");

  await moderateLink.click();
  await page.waitForURL(/\/admin\/posts\/[^/]+\/comments$/, { timeout: 15_000 });

  if (!href) {
    return null;
  }

  const match = /\/admin\/posts\/([^/]+)\/comments$/.exec(href);
  return match?.[1] ?? null;
}
