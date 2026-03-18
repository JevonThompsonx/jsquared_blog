import { existsSync } from "node:fs";
import path from "node:path";

import { expect, test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

const defaultAdminStorageStatePath = path.resolve(process.cwd(), "playwright", ".auth", "admin.json");

function resolveAdminStorageStatePath(): string | null {
  const configuredPath = process.env.E2E_ADMIN_STORAGE_STATE?.trim();

  if (configuredPath) {
    const absoluteConfiguredPath = path.resolve(process.cwd(), configuredPath);

    return existsSync(absoluteConfiguredPath) ? absoluteConfiguredPath : null;
  }

  if (existsSync(defaultAdminStorageStatePath)) {
    return defaultAdminStorageStatePath;
  }

  return null;
}

export const configuredAdminPostId = process.env.E2E_ADMIN_POST_ID?.trim() || null;
export const adminStorageStatePath = resolveAdminStorageStatePath();
export const hasAdminStorageState = adminStorageStatePath !== null;
export const adminTest = base;

if (adminStorageStatePath) {
  adminTest.use({ storageState: adminStorageStatePath });
}

export function getAdminStorageStateHint(): string {
  return `Set E2E_ADMIN_STORAGE_STATE or create playwright/.auth/admin.json with \`bun run e2e:capture-admin-state\`.`;
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
