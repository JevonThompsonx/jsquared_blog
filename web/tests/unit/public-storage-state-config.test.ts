import { describe, expect, it } from "vitest";

import { resolvePublicStorageStateCaptureConfig } from "@/lib/e2e/public-storage-state-config";

describe("resolvePublicStorageStateCaptureConfig", () => {
  it("uses the default repo-local storage-state path for localhost captures", () => {
    const config = resolvePublicStorageStateCaptureConfig({
      cwd: "C:/repo/web",
      baseURL: "http://localhost:3000",
      configuredStorageStatePath: undefined,
    });

    expect(config.storageStatePath).toBe("C:\\repo\\web\\playwright\\.auth\\public.json");
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
    });

    expect(config.storageStatePath).toBe("C:\\repo\\web\\playwright\\.auth\\public.staging.json");
  });
});
