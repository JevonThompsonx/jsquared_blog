import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `next/image` is a Client Component. Passing a `loader` function from a Server
 * Component throws "Functions cannot be passed directly to Client Components"
 * and falls back to client rendering. Server modules must use `CdnImage`, which
 * owns the loader behind a client boundary.
 */
const ROOTS = ["src/app", "src/components"];
const SOURCE_EXTENSIONS = /\.(tsx|ts)$/;

function walk(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    return statSync(fullPath).isDirectory()
      ? walk(fullPath)
      : SOURCE_EXTENSIONS.test(entry)
        ? [fullPath]
        : [];
  });
}

describe("server image loader boundary", () => {
  const files = ROOTS.flatMap((root) => walk(path.join(process.cwd(), root)));

  it.each(files)(
    "%s does not pass a loader function from a Server Component",
    (file) => {
      const source = readFileSync(file, "utf8");
      const isClientComponent = /^\s*["']use client["']/.test(source);

      if (isClientComponent) {
        return;
      }

      expect(source).not.toMatch(/loader=\{/);
    },
  );
});
