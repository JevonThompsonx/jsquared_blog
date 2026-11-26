import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("standalone WorkOS packaging", () => {
  it("traces both WorkOS packages into every standalone route", () => {
    const config = readFileSync("next.config.ts", "utf8");

    expect(config).toContain("outputFileTracingIncludes");
    expect(config).toContain("node_modules/@workos-inc/authkit-nextjs/**/*");
    expect(config).toContain("node_modules/@workos-inc/node/**/*");
    expect(config).toContain("node_modules/drizzle-orm/**/*");
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

describe("standalone migration tooling packaging", () => {
  const script = readFileSync("scripts/package-standalone.mjs", "utf8");

  it("links drizzle-orm from the standalone dependency store", () => {
    expect(script).toContain('findPnpmPackage("drizzle-orm@")');
    expect(script).toMatch(/linkRuntimePackage\(\s*"drizzle-orm"/);
  });

  it("ships the migration scripts and drizzle folder in the release", () => {
    for (const name of [
      "migrate-database.mjs",
      "verify-schema.mjs",
      "reconcile-migration-ledger.mjs",
    ]) {
      expect(script).toContain(`"${name}"`);
    }
    expect(script).toMatch(/path\.join\(webRoot,\s*"drizzle"\)/);
    expect(script).toMatch(/path\.join\(releaseAppDir,\s*"drizzle"\)/);
  });

  it("asserts the release contains the scripts, migrations, and drizzle-orm", () => {
    expect(script).toContain("verifyRelease");
    expect(script).toMatch(/drizzle-orm/);
    expect(script).toContain("drizzle/meta/_journal.json");
  });
});

describe("migration package scripts", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };

  it("exposes migrate and verify commands for the release", () => {
    expect(pkg.scripts["db:migrate:node"]).toBe(
      "node ./scripts/migrate-database.mjs",
    );
    expect(pkg.scripts["db:verify"]).toBe("node ./scripts/verify-schema.mjs");
  });

  it("exposes the one-time ledger reconciliation command", () => {
    expect(pkg.scripts["db:reconcile"]).toBe(
      "node ./scripts/reconcile-migration-ledger.mjs",
    );
  });
});
