import path from "node:path";

const DEFAULT_PUBLIC_STORAGE_STATE_PATH = path.join("playwright", ".auth", "public.json");

function isLocalOrigin(urlValue: string): boolean {
  const hostname = new URL(urlValue).hostname;
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
}

export function resolvePublicStorageStateCaptureConfig(options: {
  cwd: string;
  baseURL: string;
  configuredStorageStatePath: string | undefined;
}): { storageStatePath: string } {
  const configuredStorageStatePath = options.configuredStorageStatePath?.trim();

  if (!isLocalOrigin(options.baseURL) && !configuredStorageStatePath) {
    throw new Error("E2E_PUBLIC_STORAGE_STATE must be set when capturing public storage state for a non-local E2E_BASE_URL.");
  }

  return {
    storageStatePath: path.resolve(options.cwd, configuredStorageStatePath ?? DEFAULT_PUBLIC_STORAGE_STATE_PATH),
  };
}
