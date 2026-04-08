import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const DIRECT_TIPTAP_DEPENDENCIES = [
  "@tiptap/core",
  "@tiptap/extension-image",
  "@tiptap/extension-link",
  "@tiptap/extension-placeholder",
  "@tiptap/react",
  "@tiptap/starter-kit",
] as const;

function readWebPackageJson(): { dependencies?: Record<string, string> } {
  const packageJsonPath = path.resolve(process.cwd(), "package.json");
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };
}

describe("tiptap direct dependency contract", () => {
  it("declares @tiptap/core directly when thoughts-block imports it directly", () => {
    const packageJson = readWebPackageJson();

    expect(packageJson.dependencies?.["@tiptap/core"]).toBeTruthy();
  });

  it("keeps direct tiptap packages on one shared version", () => {
    const packageJson = readWebPackageJson();
    const dependencies = packageJson.dependencies ?? {};
    const directTiptapVersions = DIRECT_TIPTAP_DEPENDENCIES.map((dependencyName) => dependencies[dependencyName]);

    expect(new Set(directTiptapVersions).size).toBe(1);
    expect(directTiptapVersions[0]).toBeTruthy();
  });

  it("keeps the workspace lockfile in sync for @tiptap/core", () => {
    const packageJson = readWebPackageJson();
    const expectedCoreVersion = packageJson.dependencies?.["@tiptap/core"];
    const bunLockPath = path.resolve(process.cwd(), "..", "bun.lock");
    const bunLock = readFileSync(bunLockPath, "utf8");

    expect(expectedCoreVersion).toBeTruthy();
    expect(bunLock).toContain('"web": {');
    expect(bunLock).toContain(`"@tiptap/core": "${expectedCoreVersion}"`);
    expect(bunLock).toContain(`"@tiptap/core@${expectedCoreVersion}"`);
  });
});
