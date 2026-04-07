import path from "node:path";
import { createHash } from "node:crypto";

const DEFAULT_PUBLIC_STORAGE_STATE_PATH = path.join("playwright", ".auth", "public.json");
const PUBLIC_STORAGE_STATE_ERROR = "E2E_PUBLIC_STORAGE_STATE must stay under playwright/.auth and use a public*.json filename.";

export interface PublicStorageStateMetadata {
  artifactType: "public-playwright-storage-state";
  artifactVersion: 1;
  createdAt: string;
  origin: string;
  fingerprint: string;
}

function isLocalOrigin(urlValue: string): boolean {
  const hostname = new URL(urlValue).hostname;
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname);
}

function isManagedPublicStorageStatePath(cwd: string, storageStatePath: string): boolean {
  const authDirectory = path.resolve(cwd, "playwright", ".auth");
  const resolvedStorageStatePath = path.resolve(cwd, storageStatePath);
  const relativePath = path.relative(authDirectory, resolvedStorageStatePath);
  const basename = path.basename(resolvedStorageStatePath);

  return !relativePath.startsWith("..")
    && !path.isAbsolute(relativePath)
    && /^public(?:[a-z0-9._-]*)\.json$/i.test(basename);
}

export function getPublicStorageStateMetadataPath(storageStatePath: string): string {
  const parsedPath = path.parse(path.resolve(storageStatePath));
  return path.join(parsedPath.dir, `${parsedPath.name}.meta.json`);
}

export function createPublicAuthArtifactFingerprint(inputs: {
  publicEmail: string;
  publicPostSlug: string;
  fixtureGeneratedAt: string;
}): string {
  const normalizedFingerprintSource = JSON.stringify({
    publicEmail: inputs.publicEmail.trim().toLowerCase(),
    publicPostSlug: inputs.publicPostSlug.trim(),
    fixtureGeneratedAt: inputs.fixtureGeneratedAt.trim(),
  });

  return createHash("sha256").update(normalizedFingerprintSource).digest("hex");
}

export function assertPublicStorageStateCapturePreconditions(options: {
  storageStatePath: string;
  isExplicitStorageState: boolean;
  storageStateExists: boolean;
}): void {
  if (!options.storageStateExists || options.isExplicitStorageState) {
    return;
  }

  throw new Error(
    "Implicit public storage-state reuse is disabled. Delete the existing managed artifact first or set E2E_PUBLIC_STORAGE_STATE to an explicit playwright/.auth/public*.json path.",
  );
}

export function isPublicStorageStateMetadata(value: unknown): value is PublicStorageStateMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.artifactType === "public-playwright-storage-state"
    && candidate.artifactVersion === 1
    && typeof candidate.createdAt === "string"
    && candidate.createdAt.length > 0
    && typeof candidate.origin === "string"
    && candidate.origin.length > 0
    && typeof candidate.fingerprint === "string"
    && candidate.fingerprint.length > 0;
}

export function createPublicStorageStateMetadata(inputs: {
  origin: string;
  fingerprint: string;
  createdAt?: string;
}): PublicStorageStateMetadata {
  return {
    artifactType: "public-playwright-storage-state",
    artifactVersion: 1,
    createdAt: inputs.createdAt ?? new Date().toISOString(),
    origin: inputs.origin,
    fingerprint: inputs.fingerprint,
  };
}

export function resolvePublicStorageStateCaptureConfig(options: {
  cwd: string;
  baseURL: string;
  configuredStorageStatePath: string | undefined;
  allowRemoteCapture?: boolean;
}): { storageStatePath: string; metadataPath: string; isExplicitStorageState: boolean } {
  const configuredStorageStatePath = options.configuredStorageStatePath?.trim();

  if (!isLocalOrigin(options.baseURL) && !configuredStorageStatePath) {
    throw new Error("E2E_PUBLIC_STORAGE_STATE must be set when capturing public storage state for a non-local E2E_BASE_URL.");
  }

  if (!isLocalOrigin(options.baseURL) && !options.allowRemoteCapture) {
    throw new Error("E2E_ALLOW_REMOTE_PUBLIC_CAPTURE=1 is required when capturing public storage state for a non-local E2E_BASE_URL.");
  }

  if (configuredStorageStatePath && !isManagedPublicStorageStatePath(options.cwd, configuredStorageStatePath)) {
    throw new Error(PUBLIC_STORAGE_STATE_ERROR);
  }

  const storageStatePath = path.resolve(options.cwd, configuredStorageStatePath ?? DEFAULT_PUBLIC_STORAGE_STATE_PATH);

  return {
    storageStatePath,
    metadataPath: getPublicStorageStateMetadataPath(storageStatePath),
    isExplicitStorageState: Boolean(configuredStorageStatePath),
  };
}
