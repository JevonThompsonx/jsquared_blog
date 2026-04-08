import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const explicitAdminStatePath = path.resolve(process.cwd(), "tmp", "admin-state.json");
const managedAdminStatePath = path.resolve(process.cwd(), "playwright", ".auth", "admin.json");
const managedAdminMetadataPath = path.resolve(process.cwd(), "playwright", ".auth", "admin.meta.json");

const existingStorageState = new Set<string>();
const fileContents = new Map<string, string>();
const mockUse = vi.fn();

vi.mock("@playwright/test", () => ({
  expect: vi.fn(),
  test: {
    use: mockUse,
  },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn((filePath: string) => existingStorageState.has(filePath)),
  readFileSync: vi.fn((filePath: string) => {
    const value = fileContents.get(filePath);
    if (value === undefined) {
      throw new Error(`Missing file: ${filePath}`);
    }

    return value;
  }),
}));

vi.mock("@/lib/env-loader", () => ({
  loadEnvironmentFiles: vi.fn(),
}));

async function importAdminHelper() {
  vi.resetModules();
  return import("../e2e/helpers/admin");
}

describe("admin E2E helper env contract", () => {
  afterEach(() => {
    existingStorageState.clear();
    fileContents.clear();
    mockUse.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses an explicit admin storage-state path when it exists", async () => {
    vi.stubEnv("E2E_ADMIN_STORAGE_STATE", "tmp/admin-state.json");
    existingStorageState.add(explicitAdminStatePath);

    const helper = await importAdminHelper();

    expect(helper.hasAdminStorageState).toBe(true);
    expect(helper.adminStorageStatePath).toBe(explicitAdminStatePath);
    expect(mockUse).toHaveBeenCalledWith({
      storageState: explicitAdminStatePath,
    });
  });

  it("falls back to the managed admin storage-state path", async () => {
    existingStorageState.add(managedAdminStatePath);

    const helper = await importAdminHelper();

    expect(helper.hasAdminStorageState).toBe(true);
    expect(helper.adminStorageStatePath).toBe(managedAdminStatePath);
    expect(mockUse).toHaveBeenCalledWith({
      storageState: managedAdminStatePath,
    });
  });

  it("does not configure storage state when no admin auth artifact exists", async () => {
    const helper = await importAdminHelper();

    expect(helper.hasAdminStorageState).toBe(false);
    expect(helper.adminStorageStatePath).toBeNull();
    expect(mockUse).not.toHaveBeenCalled();
    expect(helper.getAdminStorageStateHint()).toContain("e2e:capture-admin-state");
  });

  it("allows remote admin mutations only when explicitly enabled", async () => {
    vi.stubEnv("E2E_BASE_URL", "https://staging.example.com");

    const helper = await importAdminHelper();

    expect(helper.canRunAdminMutationFlows).toBe(false);

    vi.stubEnv("E2E_ALLOW_REMOTE_ADMIN_MUTATIONS", "1");

    const enabledHelper = await importAdminHelper();

    expect(enabledHelper.canRunAdminMutationFlows).toBe(true);
  });

  it("ignores a managed admin storage state when its origin metadata does not match the target base URL", async () => {
    vi.stubEnv("E2E_BASE_URL", "https://staging.example.com");
    existingStorageState.add(managedAdminStatePath);
    fileContents.set(
      managedAdminMetadataPath,
      JSON.stringify({
        artifactType: "admin-playwright-storage-state",
        artifactVersion: 1,
        createdAt: "2026-04-07T00:00:00.000Z",
        origin: "https://prod.example.com",
      }),
    );

    const helper = await importAdminHelper();

    expect(helper.hasAdminStorageState).toBe(false);
    expect(helper.adminStorageStatePath).toBeNull();
    expect(mockUse).not.toHaveBeenCalled();
  });

  it("reuses a managed admin storage state when its origin metadata matches the target base URL", async () => {
    vi.stubEnv("E2E_BASE_URL", "https://staging.example.com");
    existingStorageState.add(managedAdminStatePath);
    fileContents.set(
      managedAdminMetadataPath,
      JSON.stringify({
        artifactType: "admin-playwright-storage-state",
        artifactVersion: 1,
        createdAt: "2026-04-07T00:00:00.000Z",
        origin: "https://staging.example.com",
      }),
    );

    const helper = await importAdminHelper();

    expect(helper.hasAdminStorageState).toBe(true);
    expect(helper.adminStorageStatePath).toBe(managedAdminStatePath);
    expect(mockUse).toHaveBeenCalledWith({
      storageState: managedAdminStatePath,
    });
  });
});
