import { describe, expect, it, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the server-only guard so the DAL module can be imported in test env.
// ---------------------------------------------------------------------------
vi.mock("server-only", () => ({}));

// ---------------------------------------------------------------------------
// Mock @/lib/db so tests never hit a real database.
// ---------------------------------------------------------------------------
const mockDelete = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockOrderBy = vi.fn().mockResolvedValue([]);
const mockValues = vi.fn().mockResolvedValue(undefined);
const txMock = {
  delete: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue(undefined),
};

const dbMock = {
  select: mockSelect,
  from: mockFrom,
  where: mockWhere,
  orderBy: mockOrderBy,
  delete: mockDelete,
  insert: mockInsert,
  values: mockValues,
  transaction: vi.fn(),
};

// Chain helpers — each returns a proxy so the chainable API works
mockSelect.mockReturnValue({ from: mockFrom });
mockFrom.mockReturnValue({ where: mockWhere });
mockWhere.mockReturnValue({ orderBy: mockOrderBy });
mockDelete.mockReturnValue({ where: mockWhere });
mockInsert.mockReturnValue({ values: mockValues });
// tx equivalents
txMock.delete.mockReturnValue({ where: txMock.where });
txMock.where.mockReturnValue({ values: txMock.values });
txMock.insert.mockReturnValue({ values: txMock.values });

vi.mock("@/lib/db", () => ({
  getDb: () => dbMock,
}));

// ---------------------------------------------------------------------------
// Mock drizzle operators so imports resolve without a real db instance.
// ---------------------------------------------------------------------------
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: vi.fn((_col: unknown, _val: unknown) => "eq-clause"),
    asc: vi.fn((_col: unknown) => "asc-clause"),
  };
});

vi.mock("@/drizzle/schema", () => ({
  postLinks: {
    postId: "postId",
    sortOrder: "sortOrder",
  },
}));

import { listLinksForPost, replaceLinksForPost } from "@/server/dal/post-links";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listLinksForPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
  });

  it("returns mapped rows when the table has data", async () => {
    const now = new Date();
    mockOrderBy.mockResolvedValueOnce([
      { id: "link-1", postId: "post-abc", label: "iOverlander", url: "https://ioverlander.com/places/1", sortOrder: 0, createdAt: now },
      { id: "link-2", postId: "post-abc", label: "AllTrails", url: "https://alltrails.com/trail/2", sortOrder: 1, createdAt: now },
    ]);

    const result = await listLinksForPost("post-abc");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "link-1", postId: "post-abc", label: "iOverlander", url: "https://ioverlander.com/places/1", sortOrder: 0, createdAt: now });
    expect(result[1].label).toBe("AllTrails");
  });

  it("returns empty array when no rows found", async () => {
    mockOrderBy.mockResolvedValueOnce([]);
    const result = await listLinksForPost("post-xyz");
    expect(result).toEqual([]);
  });

  it("returns empty array gracefully when table does not exist", async () => {
    mockOrderBy.mockRejectedValueOnce(new Error("no such table: post_links"));
    const result = await listLinksForPost("post-abc");
    expect(result).toEqual([]);
  });

  it("rethrows non-table-missing errors", async () => {
    mockOrderBy.mockRejectedValueOnce(new Error("SQLITE_CORRUPT: database disk image is malformed"));
    await expect(listLinksForPost("post-abc")).rejects.toThrow("SQLITE_CORRUPT");
  });

  it("coerces string createdAt values to Date objects", async () => {
    const dateString = "2025-01-15T10:30:00.000Z";
    mockOrderBy.mockResolvedValueOnce([
      { id: "link-1", postId: "post-abc", label: "Example", url: "https://example.com", sortOrder: 0, createdAt: dateString },
    ]);

    const result = await listLinksForPost("post-abc");
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].createdAt.toISOString()).toBe(dateString);
  });
});

describe("replaceLinksForPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txMock.delete.mockReturnValue({ where: txMock.where });
    txMock.where.mockResolvedValue(undefined);
    txMock.insert.mockReturnValue({ values: txMock.values });
    txMock.values.mockResolvedValue(undefined);
    dbMock.transaction.mockImplementation(async (fn: (tx: typeof txMock) => Promise<void>) => {
      await fn(txMock);
    });
  });

  it("runs a transaction that deletes then inserts links", async () => {
    await replaceLinksForPost("post-abc", [
      { label: "iOverlander", url: "https://ioverlander.com/places/1", sortOrder: 0 },
      { label: "AllTrails", url: "https://alltrails.com/trail/2", sortOrder: 1 },
    ]);

    expect(dbMock.transaction).toHaveBeenCalledOnce();
    expect(txMock.delete).toHaveBeenCalledOnce();
    expect(txMock.insert).toHaveBeenCalledOnce();
    const insertedValues = txMock.values.mock.calls[0][0] as Array<{ label: string; url: string; sortOrder: number }>;
    expect(insertedValues).toHaveLength(2);
    expect(insertedValues[0].label).toBe("iOverlander");
    expect(insertedValues[1].url).toBe("https://alltrails.com/trail/2");
  });

  it("only deletes (no insert) when links array is empty", async () => {
    await replaceLinksForPost("post-abc", []);

    expect(dbMock.transaction).toHaveBeenCalledOnce();
    expect(txMock.delete).toHaveBeenCalledOnce();
    expect(txMock.insert).not.toHaveBeenCalled();
  });

  it("falls back gracefully when post_links table does not exist", async () => {
    dbMock.transaction.mockRejectedValueOnce(new Error("no such table: post_links"));
    await expect(replaceLinksForPost("post-abc", [{ label: "X", url: "https://x.com", sortOrder: 0 }])).resolves.toBeUndefined();
  });

  it("rethrows non-table-missing errors from the transaction", async () => {
    dbMock.transaction.mockRejectedValueOnce(new Error("UNIQUE constraint failed"));
    await expect(replaceLinksForPost("post-abc", [])).rejects.toThrow("UNIQUE constraint failed");
  });

  it("assigns fallback sortOrder from array index when sortOrder is not a number", async () => {
    await replaceLinksForPost("post-abc", [
      { label: "A", url: "https://a.com", sortOrder: 0 },
      { label: "B", url: "https://b.com", sortOrder: 1 },
    ]);

    const insertedValues = txMock.values.mock.calls[0][0] as Array<{ sortOrder: number }>;
    expect(insertedValues[0].sortOrder).toBe(0);
    expect(insertedValues[1].sortOrder).toBe(1);
  });
});
