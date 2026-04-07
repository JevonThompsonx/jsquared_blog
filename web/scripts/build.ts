import { spawnSync } from "node:child_process";

import { sanitizeNodeOptionsForBuild } from "../src/lib/build/sanitize-node-options";

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
