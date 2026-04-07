import { afterEach, describe, expect, it, vi } from "vitest";

const existingStorageState = new Set<string>();
const mockUse = vi.fn();

vi.mock("@playwright/test", () => ({
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

async function importPublicHelper() {
  vi.resetModules();
  return import("../e2e/helpers/public");
}

describe("public E2E helper env contract", () => {
  afterEach(() => {
    existingStorageState.clear();
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

  it("keeps storage-state detection independent from missing email and post env", async () => {
    existingStorageState.add("C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json");

    const helper = await importPublicHelper();

    expect(helper.hasPublicStorageState).toBe(true);
    expect(helper.publicStorageStatePath).toBe(
      "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json",
    );
    expect(helper.configuredPublicEmail).toBeUndefined();
    expect(helper.configuredPublicPostSlug).toBeUndefined();
    expect(mockUse).toHaveBeenCalledWith({
      storageState: "C:\\Users\\AVAdmin\\Nextcloud\\Projects\\jsquared_blog\\web\\playwright\\.auth\\public.json",
    });
  });
});
