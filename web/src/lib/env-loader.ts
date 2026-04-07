import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";

let environmentLoaded = false;

export function getEnvironmentFilePaths(options?: { cwd?: string; includeDevVars?: boolean }): string[] {
  const currentDirectory = options?.cwd ?? process.cwd();
  const workspaceRoot = path.resolve(currentDirectory, "..");
  const includeDevVars = options?.includeDevVars ?? true;

  const candidatePaths = [
    path.join(currentDirectory, ".env.test.local"),
    path.join(currentDirectory, ".env.local"),
    path.join(currentDirectory, ".env"),
    path.join(workspaceRoot, ".env.test.local"),
    path.join(workspaceRoot, ".env.local"),
    path.join(workspaceRoot, ".env"),
  ];

  if (!includeDevVars) {
    return candidatePaths;
  }

  return [
    ...candidatePaths.slice(0, 3),
    path.join(currentDirectory, ".dev.vars"),
    ...candidatePaths.slice(3),
    path.join(workspaceRoot, ".dev.vars"),
  ];
}

export function loadEnvironmentFiles(): void {
  if (environmentLoaded) {
    return;
  }

  for (const envPath of getEnvironmentFilePaths()) {
    if (fs.existsSync(envPath)) {
      loadDotenv({ path: envPath, override: false, quiet: true });
    }
  }

  environmentLoaded = true;
}
