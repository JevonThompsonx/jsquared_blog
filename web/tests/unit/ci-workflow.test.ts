import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  path.resolve(process.cwd(), "..", ".github", "workflows", "ci.yml"),
  "utf8",
);

describe("CI security and migration gates", () => {
  it("blocks on high/critical production dependency advisories", () => {
    expect(workflow).toContain("pnpm audit --prod --audit-level=high");
  });

  it("keeps the dev-only audit informational", () => {
    const devAudit = workflow.indexOf("pnpm audit --dev --audit-level=high");
    expect(devAudit).toBeGreaterThan(-1);
    const window = workflow.slice(devAudit, devAudit + 200);
    expect(window).toContain("continue-on-error: true");
  });

  it("generates no uncommitted migration diff", () => {
    expect(workflow).toContain("pnpm run db:generate");
    expect(workflow).toContain("git diff --exit-code web/drizzle");
    // A newly generated but untracked migration must fail the gate too.
    expect(workflow).toContain("git status --porcelain web/drizzle");
  });

  it("applies and verifies migrations against a temporary database", () => {
    expect(workflow).toContain("pnpm run db:migrate:node");
    expect(workflow).toContain("pnpm run db:verify");
  });
});
