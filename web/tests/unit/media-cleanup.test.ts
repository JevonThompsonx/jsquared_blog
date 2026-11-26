import { afterEach, describe, expect, it, vi } from "vitest";

const { deleteFileMock, executeMock } = vi.hoisted(() => ({
  deleteFileMock: vi.fn(),
  executeMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getDbClient: () => ({ execute: executeMock }),
}));

vi.mock("@/lib/media/local-storage", () => ({
  deleteLocalMedia: deleteFileMock,
}));

import { deleteLocalMediaIfUnreferenced } from "@/server/media/cleanup";

describe("deleteLocalMediaIfUnreferenced", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the file when any table still references it", async () => {
    executeMock.mockResolvedValue({ rows: [{ refs: 2 }] });

    await deleteLocalMediaIfUnreferenced("2026/11/photo.webp");

    expect(deleteFileMock).not.toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining("instr(content_json"),
        args: [
          "2026/11/photo.webp",
          "2026/11/photo.webp",
          "2026/11/photo.webp",
          "2026/11/photo.webp",
          "2026/11/photo.webp",
          "2026/11/photo.webp",
        ],
      }),
    );
  });

  it("deletes the file when every reference is gone", async () => {
    executeMock.mockResolvedValue({ rows: [{ refs: 0 }] });

    await deleteLocalMediaIfUnreferenced("2026/11/photo.webp");

    expect(deleteFileMock).toHaveBeenCalledWith("2026/11/photo.webp");
  });
});
