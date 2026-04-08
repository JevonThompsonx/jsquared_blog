import path from "node:path";

export interface AdminStorageStateMetadata {
  artifactType: "admin-playwright-storage-state";
  artifactVersion: 1;
  createdAt: string;
  origin: string;
}

export function getAdminStorageStateMetadataPath(storageStatePath: string): string {
  const parsedPath = path.parse(path.resolve(storageStatePath));
  return path.join(parsedPath.dir, `${parsedPath.name}.meta.json`);
}

export function createAdminStorageStateMetadata(inputs: {
  origin: string;
  createdAt?: string;
}): AdminStorageStateMetadata {
  return {
    artifactType: "admin-playwright-storage-state",
    artifactVersion: 1,
    createdAt: inputs.createdAt ?? new Date().toISOString(),
    origin: inputs.origin,
  };
}

export function isAdminStorageStateMetadata(value: unknown): value is AdminStorageStateMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.artifactType === "admin-playwright-storage-state"
    && candidate.artifactVersion === 1
    && typeof candidate.createdAt === "string"
    && candidate.createdAt.length > 0
    && typeof candidate.origin === "string"
    && candidate.origin.length > 0;
}
