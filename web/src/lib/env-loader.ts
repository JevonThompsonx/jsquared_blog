import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

let environmentLoaded = false;

function getCandidateEnvPaths(): string[] {
  const currentDirectory = process.cwd();
  const workspaceRoot = path.resolve(currentDirectory, "..");

  return [
    path.join(currentDirectory, ".env.test.local"),
    path.join(currentDirectory, ".env.local"),
    path.join(currentDirectory, ".env"),
    path.join(currentDirectory, ".dev.vars"),
    path.join(workspaceRoot, ".env.test.local"),
    path.join(workspaceRoot, ".env.local"),
    path.join(workspaceRoot, ".env"),
    path.join(workspaceRoot, ".dev.vars"),
  ];
}

export function loadEnvironmentFiles(): void {
  if (environmentLoaded) {
    return;
  }

  for (const envPath of getCandidateEnvPaths()) {
    if (fs.existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false, quiet: true });
    }
  }

  environmentLoaded = true;
}
