import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createAdminStorageStateMetadata,
  getAdminStorageStateMetadataPath,
  isAdminStorageStateMetadata,
} from "@/lib/e2e/admin-storage-state-config";

describe("admin storage state metadata", () => {
  it("builds a sibling metadata path", () => {
    const storageStatePath = path.resolve("repo", "web", "playwright", ".auth", "admin.json");
    const expectedMetadataPath = path.join(path.dirname(storageStatePath), "admin.meta.json");

    expect(getAdminStorageStateMetadataPath(storageStatePath)).toBe(expectedMetadataPath);
  });

  it("creates valid metadata records", () => {
    const metadata = createAdminStorageStateMetadata({ origin: "https://staging.example.com" });

    expect(isAdminStorageStateMetadata(metadata)).toBe(true);
    expect(metadata.origin).toBe("https://staging.example.com");
    expect(metadata.artifactType).toBe("admin-playwright-storage-state");
  });
});
