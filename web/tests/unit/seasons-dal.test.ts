import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock server-only so it doesn't throw in test env
vi.mock("server-only", () => ({}));

// Mock the DB module
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();

const dbMock = {
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
};

vi.mock("@/lib/db", () => ({
  getDb: () => dbMock,
}));

vi.mock("@/drizzle/schema", () => ({
  seasons: { seasonKey: "season_key", id: "id", displayName: "display_name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
}));

import { listAllSeasons, upsertSeason, deleteSeasonByKey } from "@/server/dal/seasons";

describe("listAllSeasons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped season records on success", async () => {
    const now = new Date();
    const row = {
      id: "s1",
      seasonKey: "2026-2",
      displayName: "The Colorado Trip",
      createdByUserId: "u1",
      createdAt: now,
      updatedAt: now,
    };

    mockFrom.mockResolvedValue([row]);
    mockSelect.mockReturnValue({ from: mockFrom });

    const result = await listAllSeasons();

    expect(result).toHaveLength(1);
    expect(result[0]!.seasonKey).toBe("2026-2");
    expect(result[0]!.displayName).toBe("The Colorado Trip");
    expect(result[0]!.createdAt).toBeInstanceOf(Date);
    expect(result[0]!.updatedAt).toBeInstanceOf(Date);
  });

  it("returns empty array when DB throws (graceful degradation)", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockRejectedValue(new Error("no such table: seasons")),
    });

    const result = await listAllSeasons();
    expect(result).toEqual([]);
  });

  it("converts numeric timestamps to Date objects", async () => {
    const ts = Date.now();
    const row = {
      id: "s2",
      seasonKey: "2025-4",
      displayName: "Autumn Roads",
      createdByUserId: "u1",
      createdAt: ts,
      updatedAt: ts,
    };

    mockFrom.mockResolvedValue([row]);
    mockSelect.mockReturnValue({ from: mockFrom });

    const result = await listAllSeasons();
    expect(result[0]!.createdAt).toBeInstanceOf(Date);
    expect(result[0]!.updatedAt).toBeInstanceOf(Date);
  });
});

describe("upsertSeason", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls insert().values().onConflictDoUpdate() with correct data", async () => {
    mockOnConflictDoUpdate.mockResolvedValue(undefined);
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockInsert.mockReturnValue({ values: mockValues });

    await upsertSeason("id-1", "2026-2", "Spring Adventure", "user-1");

    expect(mockInsert).toHaveBeenCalledOnce();
    expect(mockValues).toHaveBeenCalledOnce();
    const insertArgs = mockValues.mock.calls[0]![0] as Record<string, unknown>;
    expect(insertArgs.id).toBe("id-1");
    expect(insertArgs.seasonKey).toBe("2026-2");
    expect(insertArgs.displayName).toBe("Spring Adventure");
    expect(insertArgs.createdByUserId).toBe("user-1");
    expect(mockOnConflictDoUpdate).toHaveBeenCalledOnce();
    const conflictArgs = mockOnConflictDoUpdate.mock.calls[0]![0] as {
      set: Record<string, unknown>;
    };
    expect(conflictArgs.set.displayName).toBe("Spring Adventure");
  });
});

describe("deleteSeasonByKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls delete().where() with the season key", async () => {
    mockWhere.mockResolvedValue(undefined);
    mockDelete.mockReturnValue({ where: mockWhere });

    await deleteSeasonByKey("2026-3");

    expect(mockDelete).toHaveBeenCalledOnce();
    expect(mockWhere).toHaveBeenCalledOnce();
  });
});
