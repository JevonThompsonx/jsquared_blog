import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("standalone WorkOS packaging", () => {
  it("traces both WorkOS packages into every standalone route", () => {
    const config = readFileSync("next.config.ts", "utf8");

    expect(config).toContain("outputFileTracingIncludes");
    expect(config).toContain("node_modules/@workos-inc/authkit-nextjs/**/*");
    expect(config).toContain("node_modules/@workos-inc/node/**/*");
  });

  it("recreates top-level runtime links for both WorkOS packages", () => {
    const script = readFileSync("scripts/package-standalone.mjs", "utf8");

    expect(script).toContain('findPnpmPackage("@workos-inc+authkit-nextjs@")');
    expect(script).toContain('findPnpmPackage("@workos-inc+node@")');
    expect(script).toMatch(
      /linkRuntimePackage\(\s*"@workos-inc\/authkit-nextjs"/,
    );
    expect(script).toMatch(/linkRuntimePackage\(\s*"@workos-inc\/node"/);
  });
});
