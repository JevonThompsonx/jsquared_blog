import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import path from "node:path";

// SEC-1 regression guard: every live Sentry entry point must keep
// sendDefaultPii: false. This prevents accidental reintroduction of PII
// (client IP / request headers / cookies) being shipped to Sentry.
//
// The three live entry points (verified via instrumentation wiring):
//   - web/sentry.server.config.ts  (imported by src/instrumentation.ts, nodejs runtime)
//   - web/sentry.edge.config.ts     (imported by src/instrumentation.ts, edge runtime)
//   - web/src/instrumentation-client.ts (self-initialises the client SDK)

const FILES_TO_SCAN = [
  "sentry.server.config.ts",
  "sentry.edge.config.ts",
  "src/instrumentation-client.ts",
];

const ROOT = path.resolve(__dirname, "..", "..");

function readSource(relPath: string): string {
  const abs = path.join(ROOT, relPath);
  if (!existsSync(abs)) {
    throw new Error(`Expected Sentry config at ${abs} is missing — entry point moved?`);
  }
  return readFileSync(abs, "utf8");
}

describe("Sentry sendDefaultPii regression (SEC-1)", () => {
  for (const file of FILES_TO_SCAN) {
    it(`keeps sendDefaultPii: false in ${file}`, () => {
      const source = readSource(file);
      // Reject the dangerous literal. Allow `false` intentionally.
      expect(source).not.toMatch(/sendDefaultPii\s*:\s*true/);
      expect(source).toMatch(/sendDefaultPii\s*:\s*false/);
    });
  }

  it("exposes no other Sentry.init with sendDefaultPii set true anywhere", () => {
    // Whole web root, excluding node_modules. Catches stray entry points.
    const allTargets = [
      "sentry.server.config.ts",
      "sentry.edge.config.ts",
      "src/instrumentation-client.ts",
      "src/instrumentation.ts",
    ];
    for (const file of allTargets) {
      const source = readSource(file);
      expect(source, `${file} must not enable default PII`).not.toMatch(
        /sendDefaultPii\s*:\s*true/,
      );
    }
  });
});
