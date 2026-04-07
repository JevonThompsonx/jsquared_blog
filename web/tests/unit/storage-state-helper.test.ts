import { describe, expect, it } from "vitest";
import path from "node:path";

import { getStorageStateHint, resolveExistingStorageStatePath } from "@/lib/e2e/storage-state-helper";

describe("storage state helper", () => {
  it("prefers an existing explicit path before the managed default", () => {
    const result = resolveExistingStorageStatePath({
      configuredPath: "tmp/state.json",
      defaultPath: "playwright/.auth/default.json",
      cwd: "C:/repo/web",
      hasStorageState: (filePath) => filePath === path.resolve("C:/repo/web", "tmp/state.json"),
    });

    expect(result).toBe(path.resolve("C:/repo/web", "tmp/state.json"));
  });

  it("falls back to the default path when the explicit path is absent", () => {
    const result = resolveExistingStorageStatePath({
      configuredPath: "tmp/state.json",
      defaultPath: "playwright/.auth/default.json",
      cwd: "C:/repo/web",
      hasStorageState: (filePath) => filePath === "playwright/.auth/default.json",
    });

    expect(result).toBe("playwright/.auth/default.json");
  });

  it("returns null when no storage-state artifact exists", () => {
    const result = resolveExistingStorageStatePath({
      configuredPath: undefined,
      defaultPath: "playwright/.auth/default.json",
      cwd: "C:/repo/web",
      hasStorageState: () => false,
    });

    expect(result).toBeNull();
  });

  it("formats capture hints consistently", () => {
    expect(getStorageStateHint({ command: "bun run e2e:capture-admin-state", label: "playwright/.auth/admin.json" })).toBe(
      "Set the explicit storage-state env or create playwright/.auth/admin.json with `bun run e2e:capture-admin-state`.",
    );
  });
});
