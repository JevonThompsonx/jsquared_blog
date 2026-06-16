import { afterEach, describe, expect, it, vi } from "vitest";

const { destroyAssetMock, logCleanupErrorMock, captureExceptionMock } = vi.hoisted(() => ({
  destroyAssetMock: vi.fn(),
  logCleanupErrorMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockTransaction = vi.fn();

const mockTx = {
  select: mockSelect,
  delete: mockDelete,
  update: mockUpdate,
};

const mockDb = {
  select: mockSelect,
  transaction: mockTransaction,
};

vi.mock("@/lib/db", () => ({
  getDb: () => mockDb,
}));

vi.mock("@/lib/cloudinary/server", () => ({
  getCloudinaryConfig: () => ({
    cloudName: "test-cloud",
    apiKey: "test-key",
    apiSecret: "test-secret",
  }),
}));

vi.mock("@/lib/sentry", () => ({
  captureException: captureExceptionMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/server/cloudinary/destroy-asset", () => ({
  destroyCloudinaryAsset: destroyAssetMock,
  logCloudinaryCleanupError: logCleanupErrorMock,
}));

import { deletePosts } from "@/server/posts/delete";

type SelectResult = unknown[];

function selectChain(result: SelectResult) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(result),
    }),
  };
}

function deleteChain() {
  return {
    where: vi.fn().mockResolvedValue(undefined),
  };
}

function updateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

afterEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReset();
  mockDelete.mockReset();
  mockUpdate.mockReset();
  mockTransaction.mockReset();
  destroyAssetMock.mockReset();
  logCleanupErrorMock.mockReset();
  captureExceptionMock.mockReset();
  destroyAssetMock.mockResolvedValue(undefined);
  logCleanupErrorMock.mockReset();
  captureExceptionMock.mockReset();
});

describe("deletePosts cloudinary cleanup", () => {
  it("destroys every cloudinary asset referenced by the post's gallery before deleting it", async () => {
    const existingPost = {
      id: "post-1",
      slug: "patagonia-notes",
      featuredImageId: null,
    };
    const galleryAsset = {
      id: "asset-1",
      provider: "cloudinary",
      publicId: "j2adventures/editorial/abc",
      resourceType: "image",
    };

    mockSelect
      .mockReturnValueOnce(selectChain([existingPost])) // existing posts
      .mockReturnValueOnce(selectChain([{ mediaAssetId: "asset-1" }])) // previewGallery (postImages)
      .mockReturnValueOnce(selectChain([])) // comments for these posts (inside tx)
      .mockReturnValueOnce(selectChain([galleryAsset])); // asset metadata for cloudinary cleanup

    mockDelete.mockReturnValue(deleteChain());
    mockUpdate.mockReturnValue(updateChain());

    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => Promise<void>) => {
      await callback(mockTx);
    });

    const result = await deletePosts(["post-1"]);

    expect(result.deletedPostIds).toEqual(["post-1"]);
    expect(destroyAssetMock).toHaveBeenCalledWith({
      publicId: "j2adventures/editorial/abc",
      resourceType: "image",
    });
  });

  it("also destroys the post's featured image asset when it is a cloudinary asset", async () => {
    const existingPost = {
      id: "post-1",
      slug: "patagonia-notes",
      featuredImageId: "featured-1",
    };

    mockSelect
      .mockReturnValueOnce(selectChain([existingPost]))
      .mockReturnValueOnce(selectChain([])) // previewGallery (postImages)
      .mockReturnValueOnce(selectChain([])) // comments (inside tx)
      .mockReturnValueOnce(selectChain([{
        id: "featured-1",
        provider: "cloudinary",
        publicId: "j2adventures/editorial/featured",
        resourceType: "image",
      }]));

    mockDelete.mockReturnValue(deleteChain());
    mockUpdate.mockReturnValue(updateChain());

    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => Promise<void>) => {
      await callback(mockTx);
    });

    await deletePosts(["post-1"]);

    expect(destroyAssetMock).toHaveBeenCalledWith({
      publicId: "j2adventures/editorial/featured",
      resourceType: "image",
    });
  });

  it("does not call cloudinary destroy for supabase-hosted assets", async () => {
    const existingPost = {
      id: "post-1",
      slug: "patagonia-notes",
      featuredImageId: null,
    };

    mockSelect
      .mockReturnValueOnce(selectChain([existingPost]))
      .mockReturnValueOnce(selectChain([{ mediaAssetId: "asset-1" }])) // previewGallery
      .mockReturnValueOnce(selectChain([])) // comments
      .mockReturnValueOnce(selectChain([{
        id: "asset-1",
        provider: "supabase",
        publicId: "ignored",
        resourceType: "image",
      }]));

    mockDelete.mockReturnValue(deleteChain());
    mockUpdate.mockReturnValue(updateChain());
    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => Promise<void>) => {
      await callback(mockTx);
    });

    await deletePosts(["post-1"]);

    expect(destroyAssetMock).not.toHaveBeenCalled();
  });

  it("continues cleanup and still returns success when one cloudinary destroy fails", async () => {
    const existingPost = {
      id: "post-1",
      slug: "patagonia-notes",
      featuredImageId: null,
    };

    mockSelect
      .mockReturnValueOnce(selectChain([existingPost]))
      .mockReturnValueOnce(selectChain([{ mediaAssetId: "asset-1" }, { mediaAssetId: "asset-2" }]))
      .mockReturnValueOnce(selectChain([]))
      .mockReturnValueOnce(selectChain([
        { id: "asset-1", provider: "cloudinary", publicId: "first", resourceType: "image" },
        { id: "asset-2", provider: "cloudinary", publicId: "second", resourceType: "image" },
      ]));

    mockDelete.mockReturnValue(deleteChain());
    mockUpdate.mockReturnValue(updateChain());
    mockTransaction.mockImplementation(async (callback: (tx: typeof mockTx) => Promise<void>) => {
      await callback(mockTx);
    });

    destroyAssetMock
      .mockRejectedValueOnce(new Error("cloudinary 500"))
      .mockResolvedValueOnce(undefined);

    const result = await deletePosts(["post-1"]);

    expect(result.deletedPostIds).toEqual(["post-1"]);
    expect(destroyAssetMock).toHaveBeenCalledTimes(2);
    expect(logCleanupErrorMock).toHaveBeenCalledTimes(1);
  });
});
