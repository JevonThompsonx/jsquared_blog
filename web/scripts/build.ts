import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { sanitizeNodeOptionsForBuild } from "../src/lib/build/sanitize-node-options";

const WINDOWS_NEXT_STATIC_DIR = path.join(process.cwd(), ".next", "static");

function removeWindowsStaticBuildOutput() {
  let attempts = 0;

  while (attempts < 2) {
    try {
      rmSync(WINDOWS_NEXT_STATIC_DIR, {
        force: true,
        recursive: true,
      });
      return;
    } catch (error) {
      attempts += 1;

      if (
        attempts < 2
        && error
        && typeof error === "object"
        && "code" in error
        && error.code === "EPERM"
      ) {
        continue;
      }

      throw error;
    }
  }
}

if (process.platform === "win32") {
  removeWindowsStaticBuildOutput();
}

const buildEnv = { ...process.env };
const sanitizedNodeOptions = sanitizeNodeOptionsForBuild(buildEnv.NODE_OPTIONS);

if (sanitizedNodeOptions) {
  buildEnv.NODE_OPTIONS = sanitizedNodeOptions;
} else {
  delete buildEnv.NODE_OPTIONS;
}

const result = spawnSync("next", ["build"], {
  cwd: process.cwd(),
  env: buildEnv,
  shell: true,
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
