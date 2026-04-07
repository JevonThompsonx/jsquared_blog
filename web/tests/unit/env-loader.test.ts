import path from "node:path";

import { describe, expect, it } from "vitest";

import { getEnvironmentFilePaths } from "@/lib/env-loader";

describe("getEnvironmentFilePaths", () => {
  it("returns cwd-first then workspace-root env files in stable order", () => {
    const cwd = path.resolve("C:/repo/web");
    const workspaceRoot = path.resolve(cwd, "..");

    expect(getEnvironmentFilePaths({ cwd })).toEqual([
      path.join(cwd, ".env.test.local"),
      path.join(cwd, ".env.local"),
      path.join(cwd, ".env"),
      path.join(cwd, ".dev.vars"),
      path.join(workspaceRoot, ".env.test.local"),
      path.join(workspaceRoot, ".env.local"),
      path.join(workspaceRoot, ".env"),
      path.join(workspaceRoot, ".dev.vars"),
    ]);
  });

  it("can exclude .dev.vars for scripts that must preserve current behavior", () => {
    const cwd = path.resolve("C:/repo/web");
    const workspaceRoot = path.resolve(cwd, "..");

    expect(getEnvironmentFilePaths({ cwd, includeDevVars: false })).toEqual([
      path.join(cwd, ".env.test.local"),
      path.join(cwd, ".env.local"),
      path.join(cwd, ".env"),
      path.join(workspaceRoot, ".env.test.local"),
      path.join(workspaceRoot, ".env.local"),
      path.join(workspaceRoot, ".env"),
    ]);
  });
});
