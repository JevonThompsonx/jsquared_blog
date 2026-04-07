import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { test as base } from "@playwright/test";

import { isPublicEnvArtifactMetadata } from "@/lib/e2e/public-env-artifact";
import { getStorageStateHint } from "@/lib/e2e/storage-state-helper";
import { loadEnvironmentFiles } from "../../../src/lib/env-loader";
import {
  createPublicAuthArtifactFingerprint,
  getPublicStorageStateMetadataPath,
  isPublicStorageStateMetadata,
  resolvePublicStorageStateCaptureConfig,
} from "@/lib/e2e/public-storage-state-config";

loadEnvironmentFiles();

const defaultPublicStorageStatePath = path.resolve(process.cwd(), "playwright", ".auth", "public.json");
const configuredBaseUrl = process.env.E2E_BASE_URL?.trim() || "http://localhost:3000";
const publicFixtureGeneratedAt = process.env.E2E_PUBLIC_FIXTURE_GENERATED_AT?.trim() || undefined;

function readPublicStorageStateMetadata(storageStatePath: string): ReturnType<typeof parsePublicStorageStateMetadata> {
  const metadataPath = getPublicStorageStateMetadataPath(storageStatePath);

  try {
    return parsePublicStorageStateMetadata(readFileSync(metadataPath, "utf8"));
  } catch {
    return null;
  }
}

function parsePublicStorageStateMetadata(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isPublicStorageStateMetadata(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parsePublicEnvMetadata(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isPublicEnvArtifactMetadata(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function hasMatchingPublicStorageStateFingerprint(storageStatePath: string): boolean {
  const metadata = readPublicStorageStateMetadata(storageStatePath);
  if (!metadata) {
    return false;
  }

  if (metadata.origin !== new URL(configuredBaseUrl).origin) {
    return false;
  }

  const envMetadata = parsePublicEnvMetadata(process.env.E2E_PUBLIC_ENV_METADATA);
  const effectiveFixtureGeneratedAt = publicFixtureGeneratedAt ?? envMetadata?.createdAt;
  const effectivePostSlug = configuredPublicPostSlug ?? envMetadata?.publicPostSlug;

  if (!configuredPublicEmail || !effectiveFixtureGeneratedAt || !effectivePostSlug) {
    return false;
  }

  return metadata.fingerprint === createPublicAuthArtifactFingerprint({
    publicEmail: configuredPublicEmail,
    publicPostSlug: effectivePostSlug,
    fixtureGeneratedAt: effectiveFixtureGeneratedAt,
  });
}

function resolvePublicStorageStatePath(): string | null {
  const configuredPath = process.env.E2E_PUBLIC_STORAGE_STATE?.trim();
  if (configuredPath) {
    try {
      const managedConfig = resolvePublicStorageStateCaptureConfig({
        cwd: process.cwd(),
        baseURL: configuredBaseUrl,
        configuredStorageStatePath: configuredPath,
      });
      return existsSync(managedConfig.storageStatePath) && hasMatchingPublicStorageStateFingerprint(managedConfig.storageStatePath)
        ? managedConfig.storageStatePath
        : null;
    } catch {
      return null;
    }
  }

  if (existsSync(defaultPublicStorageStatePath) && hasMatchingPublicStorageStateFingerprint(defaultPublicStorageStatePath)) {
    return defaultPublicStorageStatePath;
  }

  return null;
}

export const configuredPublicEmail = process.env.E2E_PUBLIC_EMAIL?.trim() || undefined;
export const configuredPublicPostSlug = process.env.E2E_PUBLIC_POST_SLUG?.trim() || undefined;
export const publicStorageStatePath = resolvePublicStorageStatePath();
export const hasPublicStorageState = publicStorageStatePath !== null;
export const publicTest = base;

if (publicStorageStatePath) {
  publicTest.use({ storageState: publicStorageStatePath });
}

export function getPublicStorageStateHint(): string {
  return `${getStorageStateHint({
    command: "bun run e2e:capture-public-state",
    label: "playwright/.auth/public.json",
  })} after configuring E2E_PUBLIC_EMAIL and E2E_PUBLIC_PASSWORD, and regenerate the matching metadata when fixtures change.`;
}
