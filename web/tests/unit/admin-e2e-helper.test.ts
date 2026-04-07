import { afterEach, describe, expect, it, vi } from "vitest";

const existingStorageState = new Set<string>();
const mockUse = vi.fn();

vi.mock("@playwright/test", () => ({
  expect: vi.fn(),
  test: {
    use: mockUse,
  },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn((filePath: string) => existingStorageState.has(filePath)),
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
    mockUse.mockReset();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses an explicit admin storage-state path when it exists", async () => {
    vi.stubEnv("E2E_ADMIN_STORAGE_STATE", "tmp/admin-state.json");
    existingStorageState.add("C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\tmp\\admin-state.json");

    const helper = await importAdminHelper();

    expect(helper.hasAdminStorageState).toBe(true);
    expect(helper.adminStorageStatePath).toBe(
      "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\tmp\\admin-state.json",
    );
    expect(mockUse).toHaveBeenCalledWith({
      storageState: "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\tmp\\admin-state.json",
    });
  });

  it("falls back to the managed admin storage-state path", async () => {
    existingStorageState.add("C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\admin.json");

    const helper = await importAdminHelper();

    expect(helper.hasAdminStorageState).toBe(true);
    expect(helper.adminStorageStatePath).toBe(
      "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\admin.json",
    );
    expect(mockUse).toHaveBeenCalledWith({
      storageState: "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\admin.json",
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
});
