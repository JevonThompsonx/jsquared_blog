import { afterEach, describe, expect, it, vi } from "vitest";

import { createPublicAuthArtifactFingerprint } from "@/lib/e2e/public-storage-state-config";

const existingStorageState = new Set<string>();
const existingMetadata = new Map<string, string>();
const mockUse = vi.fn();

vi.mock("@playwright/test", () => ({
  test: {
    use: mockUse,
  },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn((filePath: string) => existingStorageState.has(filePath)),
  readFileSync: vi.fn((filePath: string) => {
    const value = existingMetadata.get(filePath);
    if (typeof value !== "string") {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }

    return value;
  }),
}));

vi.mock("@/lib/env-loader", () => ({
  loadEnvironmentFiles: vi.fn(),
}));

async function importPublicHelper() {
  vi.resetModules();
  return import("../e2e/helpers/public");
}

describe("public E2E helper env contract", () => {
  afterEach(() => {
    existingStorageState.clear();
    existingMetadata.clear();
    mockUse.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("leaves configured public auth and post values unset when the env is missing", async () => {
    const helper = await importPublicHelper();

    expect(helper.configuredPublicEmail).toBeUndefined();
    expect(helper.configuredPublicPostSlug).toBeUndefined();
  });

  it("trims configured public auth and post values when the env is present", async () => {
    vi.stubEnv("E2E_PUBLIC_EMAIL", "  reader@example.com  ");
    vi.stubEnv("E2E_PUBLIC_POST_SLUG", "  seeded-post  ");

    const helper = await importPublicHelper();

    expect(helper.configuredPublicEmail).toBe("reader@example.com");
    expect(helper.configuredPublicPostSlug).toBe("seeded-post");
  });

  it("treats whitespace-only env values as unset", async () => {
    vi.stubEnv("E2E_PUBLIC_EMAIL", "   ");
    vi.stubEnv("E2E_PUBLIC_POST_SLUG", "   ");

    const helper = await importPublicHelper();

    expect(helper.configuredPublicEmail).toBeUndefined();
    expect(helper.configuredPublicPostSlug).toBeUndefined();
  });

  it("does not reuse persisted public storage state when fixture identity env is missing", async () => {
    existingStorageState.add("C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json");
    existingMetadata.set(
      "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.meta.json",
      JSON.stringify({
        artifactType: "public-playwright-storage-state",
        artifactVersion: 1,
        createdAt: "2026-04-07T10:00:00.000Z",
        origin: "http://localhost:3000",
        fingerprint: "stable-fingerprint",
      }),
    );

    const helper = await importPublicHelper();

    expect(helper.hasPublicStorageState).toBe(false);
    expect(helper.publicStorageStatePath).toBeNull();
    expect(helper.configuredPublicEmail).toBeUndefined();
    expect(helper.configuredPublicPostSlug).toBeUndefined();
    expect(mockUse).not.toHaveBeenCalled();
  });

  it("reuses persisted public storage state when env metadata provides the matching fixture fingerprint", async () => {
    vi.stubEnv("E2E_BASE_URL", "http://localhost:3000");
    vi.stubEnv("E2E_PUBLIC_EMAIL", "reader@example.com");
    vi.stubEnv("E2E_PUBLIC_ENV_METADATA", JSON.stringify({
      artifactType: "public-e2e-env",
      artifactVersion: 1,
      createdAt: "2026-04-07T12:00:00.000Z",
      publicEmailHash: "ignored-by-helper",
      publicPostSlug: "seeded-post",
    }));

    existingStorageState.add("C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json");
    existingMetadata.set(
      "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.meta.json",
      JSON.stringify({
        artifactType: "public-playwright-storage-state",
        artifactVersion: 1,
        createdAt: "2026-04-07T12:05:00.000Z",
        origin: "http://localhost:3000",
        fingerprint: createPublicAuthArtifactFingerprint({
          publicEmail: "reader@example.com",
          publicPostSlug: "seeded-post",
          fixtureGeneratedAt: "2026-04-07T12:00:00.000Z",
        }),
      }),
    );

    const helper = await importPublicHelper();

    expect(helper.hasPublicStorageState).toBe(true);
    expect(helper.publicStorageStatePath).toBe(
      "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json",
    );
    expect(mockUse).toHaveBeenCalledWith({
      storageState: "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json",
    });
  });

  it("does not reuse persisted public storage state when the ownership metadata is missing", async () => {
    existingStorageState.add("C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json");

    const helper = await importPublicHelper();

    expect(helper.hasPublicStorageState).toBe(false);
    expect(helper.publicStorageStatePath).toBeNull();
    expect(mockUse).not.toHaveBeenCalled();
    expect(helper.getPublicStorageStateHint()).toContain("regenerate the matching metadata");
  });

  it("does not reuse persisted public storage state when the configured fixture fingerprint does not match", async () => {
    vi.stubEnv("E2E_PUBLIC_EMAIL", "reader@example.com");
    vi.stubEnv("E2E_PUBLIC_POST_SLUG", "seeded-post");
    vi.stubEnv("E2E_PUBLIC_FIXTURE_GENERATED_AT", "2026-04-07T12:00:00.000Z");

    existingStorageState.add("C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json");
    existingMetadata.set(
      "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.meta.json",
      JSON.stringify({
        artifactType: "public-playwright-storage-state",
        artifactVersion: 1,
        createdAt: "2026-04-07T10:00:00.000Z",
        origin: "http://localhost:3000",
        fingerprint: "different-fingerprint",
      }),
    );

    const helper = await importPublicHelper();

    expect(helper.hasPublicStorageState).toBe(false);
    expect(helper.publicStorageStatePath).toBeNull();
    expect(mockUse).not.toHaveBeenCalled();
  });

  it("does not reuse persisted public storage state when the captured origin does not match the active base URL", async () => {
    vi.stubEnv("E2E_BASE_URL", "https://staging.example.com");
    vi.stubEnv("E2E_PUBLIC_EMAIL", "reader@example.com");
    vi.stubEnv("E2E_PUBLIC_POST_SLUG", "seeded-post");
    vi.stubEnv("E2E_PUBLIC_FIXTURE_GENERATED_AT", "2026-04-07T12:00:00.000Z");

    existingStorageState.add("C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json");
    existingMetadata.set(
      "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.meta.json",
      JSON.stringify({
        artifactType: "public-playwright-storage-state",
        artifactVersion: 1,
        createdAt: "2026-04-07T12:05:00.000Z",
        origin: "http://localhost:3000",
        fingerprint: createPublicAuthArtifactFingerprint({
          publicEmail: "reader@example.com",
          publicPostSlug: "seeded-post",
          fixtureGeneratedAt: "2026-04-07T12:00:00.000Z",
        }),
      }),
    );

    const helper = await importPublicHelper();

    expect(helper.hasPublicStorageState).toBe(false);
    expect(helper.publicStorageStatePath).toBeNull();
    expect(mockUse).not.toHaveBeenCalled();
  });

  it("does not reuse persisted public storage state from an unmanaged explicit path", async () => {
    vi.stubEnv("E2E_PUBLIC_STORAGE_STATE", "tmp/public.json");

    existingStorageState.add("C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\tmp\\public.json");
    existingMetadata.set(
      "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\tmp\\public.meta.json",
      JSON.stringify({
        artifactType: "public-playwright-storage-state",
        artifactVersion: 1,
        createdAt: "2026-04-07T12:05:00.000Z",
        origin: "http://localhost:3000",
        fingerprint: createPublicAuthArtifactFingerprint({
          publicEmail: "reader@example.com",
          publicPostSlug: "seeded-post",
          fixtureGeneratedAt: "2026-04-07T12:00:00.000Z",
        }),
      }),
    );

    const helper = await importPublicHelper();

    expect(helper.hasPublicStorageState).toBe(false);
    expect(helper.publicStorageStatePath).toBeNull();
    expect(mockUse).not.toHaveBeenCalled();
  });
});
