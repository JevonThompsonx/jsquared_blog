import { describe, expect, it } from "vitest";

import {
  createPublicEnvArtifactMetadata,
  isPublicEnvArtifactMetadata,
} from "@/lib/e2e/public-env-artifact";

describe("public env artifact metadata", () => {
  it("creates stable hashed metadata for the seeded public fixture env", () => {
    const left = createPublicEnvArtifactMetadata({
      publicEmail: " Reader@example.com ",
      publicPostSlug: " seeded-post ",
      createdAt: "2026-04-07T12:00:00.000Z",
    });

    const right = createPublicEnvArtifactMetadata({
      publicEmail: "reader@example.com",
      publicPostSlug: "seeded-post",
      createdAt: "2026-04-07T12:00:00.000Z",
    });

    expect(left).toEqual(right);
    expect(left.publicEmailHash).not.toContain("reader@example.com");
  });

  it("accepts only valid public env artifact metadata objects", () => {
    expect(isPublicEnvArtifactMetadata(createPublicEnvArtifactMetadata({
      publicEmail: "reader@example.com",
      publicPostSlug: "seeded-post",
      createdAt: "2026-04-07T12:00:00.000Z",
    }))).toBe(true);

    expect(isPublicEnvArtifactMetadata({
      artifactType: "public-e2e-env",
      artifactVersion: 1,
      createdAt: "",
      publicEmailHash: "hash",
      publicPostSlug: "seeded-post",
    })).toBe(false);
  });
});
