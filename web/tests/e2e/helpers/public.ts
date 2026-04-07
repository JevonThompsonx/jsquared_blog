import { existsSync } from "node:fs";
import path from "node:path";

import { test as base } from "@playwright/test";

import { loadEnvironmentFiles } from "../../../src/lib/env-loader";

loadEnvironmentFiles();

const defaultPublicStorageStatePath = path.resolve(process.cwd(), "playwright", ".auth", "public.json");

function resolvePublicStorageStatePath(): string | null {
  const configuredPath = process.env.E2E_PUBLIC_STORAGE_STATE?.trim();

  if (configuredPath) {
    const absoluteConfiguredPath = path.resolve(process.cwd(), configuredPath);
    return existsSync(absoluteConfiguredPath) ? absoluteConfiguredPath : null;
  }

  if (existsSync(defaultPublicStorageStatePath)) {
    return defaultPublicStorageStatePath;
  }

  return null;
}

export const configuredPublicEmail = process.env.E2E_PUBLIC_EMAIL?.trim() || "e2e-public@jsquaredadventures.test";
export const configuredPublicPostSlug = process.env.E2E_PUBLIC_POST_SLUG?.trim() || "e2e-admin-fixture-post";
export const publicStorageStatePath = resolvePublicStorageStatePath();
export const hasPublicStorageState = publicStorageStatePath !== null;
export const publicTest = base;

if (publicStorageStatePath) {
  publicTest.use({ storageState: publicStorageStatePath });
}

export function getPublicStorageStateHint(): string {
  return "Set E2E_PUBLIC_STORAGE_STATE or create playwright/.auth/public.json with `bun run e2e:capture-public-state` after configuring E2E_PUBLIC_EMAIL and E2E_PUBLIC_PASSWORD.";
}
