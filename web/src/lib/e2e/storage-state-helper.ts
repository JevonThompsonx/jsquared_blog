import path from "node:path";

interface ResolveExistingStorageStatePathOptions {
  configuredPath?: string;
  defaultPath: string;
  cwd?: string;
  hasStorageState: (filePath: string) => boolean;
}

export function resolveExistingStorageStatePath({
  configuredPath,
  defaultPath,
  cwd = process.cwd(),
  hasStorageState,
}: ResolveExistingStorageStatePathOptions): string | null {
  const trimmedConfiguredPath = configuredPath?.trim();

  if (trimmedConfiguredPath) {
    const absoluteConfiguredPath = path.resolve(cwd, trimmedConfiguredPath);
    if (hasStorageState(absoluteConfiguredPath)) {
      return absoluteConfiguredPath;
    }
  }

  return hasStorageState(defaultPath) ? defaultPath : null;
}

export function getStorageStateHint(options: { command: string; label: string }): string {
  return `Set the explicit storage-state env or create ${options.label} with \`${options.command}\`.`;
}
