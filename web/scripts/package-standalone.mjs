#!/usr/bin/env node
/**
 * Assemble a self-contained Node release from `next build` output.
 *
 * Usage:
 *   node scripts/package-standalone.mjs /path/to/release
 *
 * Next's `output: "standalone"` copies traced production dependencies under
 * `.next/standalone/node_modules/.pnpm` but does not create top-level links for
 * packages loaded dynamically at runtime (sharp for image optimization and
 * @libsql/client for the database). Without those links the release only works
 * on a machine that also has the workspace `node_modules` — which the server
 * does not. This script recreates the links with paths relative to the release,
 * then copies static assets and `public/`.
 */
import { cp, mkdir, readdir, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const outputArg = process.argv[2];

if (!outputArg) {
  console.error("Usage: node scripts/package-standalone.mjs <output-dir>");
  process.exit(1);
}

const outputDir = path.resolve(outputArg);
const webRoot = process.cwd();
const filesystemRoot = path.parse(outputDir).root;

// This script deletes the output directory first. Refuse anything that could
// plausibly be the repo, the release root, home, or a filesystem root.
const forbidden = new Set([
  filesystemRoot,
  os.homedir(),
  webRoot,
  path.join(webRoot, ".."),
  "/srv/blog",
  "/srv/blog/shared",
  "/srv/blog/releases",
]);
if (
  forbidden.has(outputDir) ||
  webRoot === outputDir ||
  webRoot.startsWith(`${outputDir}${path.sep}`) ||
  outputDir.length < 5
) {
  console.error(`Refusing to remove unsafe output directory: ${outputDir}`);
  process.exit(1);
}
const standalone = path.join(webRoot, ".next", "standalone");
const appDir = path.join(standalone, "web");
const releaseAppDir = path.join(outputDir, "web");

async function findPnpmPackage(prefix) {
  const store = path.join(standalone, "node_modules", ".pnpm");
  const entries = (await readdir(store))
    .filter((entry) => entry.startsWith(prefix))
    // Prefer the shortest match: peer-variant dirs append `_<peer>@<version>`,
    // so the plain versioned name sorts first deterministically.
    .sort((a, b) => a.length - b.length || a.localeCompare(b));
  const packageName = prefix.replace(/\+/g, "/").replace(/@$/, "");

  for (const entry of entries) {
    const candidate = path.join(store, entry, "node_modules", packageName);
    try {
      const stat = await import("node:fs/promises").then((fs) =>
        fs.stat(candidate),
      );
      if (stat.isDirectory()) return candidate;
    } catch {
      // keep looking
    }
  }

  throw new Error(`Cannot find ${prefix} in ${store}`);
}

async function linkRuntimePackage(packageName, relativeTarget) {
  const targetDir = path.join(releaseAppDir, "node_modules", packageName);
  await mkdir(path.dirname(targetDir), { recursive: true });
  await rm(targetDir, { recursive: true, force: true });

  const linkTarget = path.relative(
    path.dirname(targetDir),
    path.join(outputDir, relativeTarget),
  );
  await symlink(linkTarget, targetDir, "dir");
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await cp(standalone, outputDir, { recursive: true, verbatimSymlinks: true });
await cp(
  path.join(webRoot, ".next", "static"),
  path.join(releaseAppDir, ".next", "static"),
  {
    recursive: true,
  },
);
await cp(path.join(webRoot, "public"), path.join(releaseAppDir, "public"), {
  recursive: true,
});

// Never ship local/test environment files. Runtime values come from the
// systemd EnvironmentFile; stale test values only cause surprises.
for (const name of [
  ".env",
  ".env.local",
  ".env.test.local",
  ".dev.vars",
  ".env.example",
]) {
  await rm(path.join(releaseAppDir, name), { force: true });
}

const sharpDir = await findPnpmPackage("sharp@");
const libsqlClientDir = await findPnpmPackage("@libsql+client@");
const libsqlCoreDir = await findPnpmPackage("@libsql+core@");
const authkitNextjsDir = await findPnpmPackage("@workos-inc+authkit-nextjs@");
const workosNodeDir = await findPnpmPackage("@workos-inc+node@");

await linkRuntimePackage("sharp", path.relative(standalone, sharpDir));
await linkRuntimePackage(
  "@libsql/client",
  path.relative(standalone, libsqlClientDir),
);
await linkRuntimePackage(
  "@libsql/core",
  path.relative(standalone, libsqlCoreDir),
);
await linkRuntimePackage(
  "@workos-inc/authkit-nextjs",
  path.relative(standalone, authkitNextjsDir),
);
await linkRuntimePackage(
  "@workos-inc/node",
  path.relative(standalone, workosNodeDir),
);

console.log(`Release assembled at ${outputDir}`);
console.log(`  app:    ${releaseAppDir}`);
console.log(`  sharp:  ${sharpDir}`);
console.log(`  libsql: ${libsqlClientDir}`);
console.log(`  authkit: ${authkitNextjsDir}`);
console.log(`  workos: ${workosNodeDir}`);
