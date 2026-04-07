import { describe, expect, it } from "vitest";

import {
  assertPublicStorageStateCapturePreconditions,
  createPublicAuthArtifactFingerprint,
  getPublicStorageStateMetadataPath,
  resolvePublicStorageStateCaptureConfig,
} from "@/lib/e2e/public-storage-state-config";

describe("resolvePublicStorageStateCaptureConfig", () => {
  it("uses the default repo-local storage-state path for localhost captures", () => {
    const config = resolvePublicStorageStateCaptureConfig({
      cwd: "C:/repo/web",
      baseURL: "http://localhost:3000",
      configuredStorageStatePath: undefined,
    });

    expect(config.storageStatePath).toBe("C:\\repo\\web\\playwright\\.auth\\public.json");
    expect(config.metadataPath).toBe("C:\\repo\\web\\playwright\\.auth\\public.meta.json");
    expect(config.isExplicitStorageState).toBe(false);
  });

  it("requires an explicit storage-state path for non-local origins", () => {
    expect(() => resolvePublicStorageStateCaptureConfig({
      cwd: "C:/repo/web",
      baseURL: "https://staging.example.com",
      configuredStorageStatePath: undefined,
    })).toThrow(
      "E2E_PUBLIC_STORAGE_STATE must be set when capturing public storage state for a non-local E2E_BASE_URL.",
    );
  });

  it("allows an explicit storage-state path for non-local origins", () => {
    const config = resolvePublicStorageStateCaptureConfig({
      cwd: "C:/repo/web",
      baseURL: "https://staging.example.com",
      configuredStorageStatePath: "playwright/.auth/public.staging.json",
      allowRemoteCapture: true,
    });

    expect(config.storageStatePath).toBe("C:\\repo\\web\\playwright\\.auth\\public.staging.json");
    expect(config.metadataPath).toBe("C:\\repo\\web\\playwright\\.auth\\public.staging.meta.json");
    expect(config.isExplicitStorageState).toBe(true);
  });

  it("refuses non-local capture without explicit remote opt-in", () => {
    expect(() => resolvePublicStorageStateCaptureConfig({
      cwd: "C:/repo/web",
      baseURL: "https://staging.example.com",
      configuredStorageStatePath: "playwright/.auth/public.staging.json",
      allowRemoteCapture: false,
    })).toThrow("E2E_ALLOW_REMOTE_PUBLIC_CAPTURE=1 is required when capturing public storage state for a non-local E2E_BASE_URL.");
  });

  it("rejects explicit storage-state paths outside playwright/.auth", () => {
    expect(() => resolvePublicStorageStateCaptureConfig({
      cwd: "C:/repo/web",
      baseURL: "http://localhost:3000",
      configuredStorageStatePath: "tmp/public.json",
    })).toThrow("E2E_PUBLIC_STORAGE_STATE must stay under playwright/.auth and use a public*.json filename.");
  });

  it("rejects explicit storage-state paths that do not use a public*.json filename", () => {
    expect(() => resolvePublicStorageStateCaptureConfig({
      cwd: "C:/repo/web",
      baseURL: "http://localhost:3000",
      configuredStorageStatePath: "playwright/.auth/admin.json",
    })).toThrow("E2E_PUBLIC_STORAGE_STATE must stay under playwright/.auth and use a public*.json filename.");
  });
});

describe("public storage-state metadata helpers", () => {
  it("derives a sidecar metadata path next to the storage-state file", () => {
    expect(getPublicStorageStateMetadataPath("C:/repo/web/playwright/.auth/public.staging.json")).toBe(
      "C:\\repo\\web\\playwright\\.auth\\public.staging.meta.json",
    );
  });

  it("creates a stable fingerprint from the seeded public fixture inputs", () => {
    const left = createPublicAuthArtifactFingerprint({
      publicEmail: " reader@example.com ",
      publicPostSlug: " seeded-post ",
      fixtureGeneratedAt: "2026-04-07T10:00:00.000Z",
    });

    const right = createPublicAuthArtifactFingerprint({
      publicEmail: "reader@example.com",
      publicPostSlug: "seeded-post",
      fixtureGeneratedAt: "2026-04-07T10:00:00.000Z",
    });

    expect(left).toBe(right);
  });
});

describe("assertPublicStorageStateCapturePreconditions", () => {
  it("refuses to overwrite the implicit local default storage-state path", () => {
    expect(() => assertPublicStorageStateCapturePreconditions({
      storageStatePath: "C:/repo/web/playwright/.auth/public.json",
      isExplicitStorageState: false,
      storageStateExists: true,
    })).toThrow(
      "Implicit public storage-state reuse is disabled. Delete the existing managed artifact first or set E2E_PUBLIC_STORAGE_STATE to an explicit playwright/.auth/public*.json path.",
    );
  });

  it("allows writing to a fresh implicit local default storage-state path", () => {
    expect(() => assertPublicStorageStateCapturePreconditions({
      storageStatePath: "C:/repo/web/playwright/.auth/public.json",
      isExplicitStorageState: false,
      storageStateExists: false,
    })).not.toThrow();
  });

  it("allows overwriting an explicit managed public storage-state path", () => {
    expect(() => assertPublicStorageStateCapturePreconditions({
      storageStatePath: "C:/repo/web/playwright/.auth/public.staging.json",
      isExplicitStorageState: true,
      storageStateExists: true,
    })).not.toThrow();
  });
});
