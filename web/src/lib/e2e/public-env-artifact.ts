import { createHash } from "node:crypto";

export interface PublicEnvArtifactMetadata {
  artifactType: "public-e2e-env";
  artifactVersion: 1;
  createdAt: string;
  publicEmailHash: string;
  publicPostSlug: string;
}

function hashPublicEmail(publicEmail: string): string {
  return createHash("sha256").update(publicEmail.trim().toLowerCase()).digest("hex");
}

export function createPublicEnvArtifactMetadata(inputs: {
  publicEmail: string;
  publicPostSlug: string;
  createdAt?: string;
}): PublicEnvArtifactMetadata {
  return {
    artifactType: "public-e2e-env",
    artifactVersion: 1,
    createdAt: inputs.createdAt ?? new Date().toISOString(),
    publicEmailHash: hashPublicEmail(inputs.publicEmail),
    publicPostSlug: inputs.publicPostSlug.trim(),
  };
}

export function isPublicEnvArtifactMetadata(value: unknown): value is PublicEnvArtifactMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return candidate.artifactType === "public-e2e-env"
    && candidate.artifactVersion === 1
    && typeof candidate.createdAt === "string"
    && candidate.createdAt.length > 0
    && typeof candidate.publicEmailHash === "string"
    && candidate.publicEmailHash.length > 0
    && typeof candidate.publicPostSlug === "string"
    && candidate.publicPostSlug.length > 0;
}
