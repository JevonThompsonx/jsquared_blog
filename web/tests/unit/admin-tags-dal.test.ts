import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockValues = vi.fn();
const mockSet = vi.fn();
const mockGroupBy = vi.fn();
const mockLeftJoin = vi.fn();
const mockOrderBy = vi.fn();

const dbMock = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

vi.mock("@/lib/db", () => ({
  getDb: () => dbMock,
}));

vi.mock("@/drizzle/schema", () => ({
  tags: {
    id: "id",
    name: "name",
    slug: "slug",
    description: "description",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  postTags: { postId: "post_id", tagId: "tag_id" },
}));

vi.mock("drizzle-orm", () => ({
  asc: vi.fn((col) => ({ kind: "asc", col })),
  count: vi.fn((col) => ({ kind: "count", col })),
  eq: vi.fn((col, val) => ({ col, val })),
}));

import {
  createTag,
  deleteTag,
  listAllTagsWithCounts,
  TagInUseError,
  TagSlugConflictError,
  tagSlugExists,
  updateTag,
  updateTagDescription,
} from "@/server/dal/admin-tags";

function makeSelectGrouped(rows: unknown[]) {
  // .from().leftJoin().groupBy().orderBy() chain ends in the rows promise.
  mockOrderBy.mockReturnValue(rows);
  mockGroupBy.mockReturnValue({ orderBy: mockOrderBy });
  mockLeftJoin.mockReturnValue({ groupBy: mockGroupBy });
  mockFrom.mockReturnValue({ leftJoin: mockLeftJoin, groupBy: mockGroupBy });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function makeSelectWhere(rows: unknown[]) {
  mockWhere.mockResolvedValue(rows);
  mockFrom.mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function makeInsertChain() {
  mockValues.mockResolvedValue(undefined);
  mockInsert.mockReturnValue({ values: mockValues });
}

function makeUpdateChain() {
  mockSet.mockReturnValue({ where: mockWhere });
  mockWhere.mockResolvedValue(undefined);
  mockUpdate.mockReturnValue({ set: mockSet });
}

function makeDeleteChain() {
  mockWhere.mockResolvedValue(undefined);
  mockDelete.mockReturnValue({ where: mockWhere });
}

describe("createTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets createdAt and updatedAt to the same value on insert", async () => {
    makeSelectWhere([]);
    makeInsertChain();

    const result = await createTag({ name: "Overlanding", description: "Stories from the trail" });

    expect(result.id).toBe("tag-overlanding");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(result.updatedAt.getTime());

    expect(mockInsert).toHaveBeenCalledOnce();
    const insertArgs = mockValues.mock.calls[0]![0] as Record<string, unknown>;
    expect(insertArgs.id).toBe("tag-overlanding");
    expect(insertArgs.slug).toBe("overlanding");
    expect(insertArgs.name).toBe("Overlanding");
    expect(insertArgs.description).toBe("Stories from the trail");
    expect(insertArgs.createdAt).toBeInstanceOf(Date);
    expect(insertArgs.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects blank tag names", async () => {
    await expect(createTag({ name: "" })).rejects.toThrow("Tag name is required");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws TagSlugConflictError when slug is taken", async () => {
    makeSelectWhere([{ id: "tag-overlanding" }]);
    await expect(createTag({ name: "Overlanding" })).rejects.toBeInstanceOf(TagSlugConflictError);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("uses provided slug when supplied", async () => {
    makeSelectWhere([]);
    makeInsertChain();

    const result = await createTag({ name: "Overlanding", slug: "  off-road  " });

    expect(result.id).toBe("tag-off-road");
    const insertArgs = mockValues.mock.calls[0]![0] as Record<string, unknown>;
    expect(insertArgs.slug).toBe("off-road");
  });

  it("normalises blank description to null", async () => {
    makeSelectWhere([]);
    makeInsertChain();

    await createTag({ name: "Overlanding", description: "   " });

    const insertArgs = mockValues.mock.calls[0]![0] as Record<string, unknown>;
    expect(insertArgs.description).toBeNull();
  });
});

describe("updateTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the updatedAt timestamp on any change", async () => {
    makeUpdateChain();

    const before = Date.now();
    const result = await updateTag({ id: "tag-1", description: "Updated copy" });
    const after = Date.now();

    expect(result.id).toBe("tag-1");
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.updatedAt.getTime()).toBeLessThanOrEqual(after);

    const setArgs = mockSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArgs.description).toBe("Updated copy");
    expect(setArgs.updatedAt).toBeInstanceOf(Date);
  });

  it("updates the name and slug and detects slug conflict", async () => {
    makeSelectWhere([{ id: "tag-2" }]);
    await expect(updateTag({ id: "tag-1", name: "Overland", slug: "overland" })).rejects.toBeInstanceOf(
      TagSlugConflictError,
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("allows updating to the same slug (same id)", async () => {
    mockWhere.mockResolvedValueOnce([{ id: "tag-1" }]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    makeUpdateChain();

    await updateTag({ id: "tag-1", slug: "overland" });

    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("rejects empty id", async () => {
    await expect(updateTag({ id: "", name: "x" })).rejects.toThrow("Tag id is required");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects empty name when provided", async () => {
    await expect(updateTag({ id: "tag-1", name: "   " })).rejects.toThrow("Tag name is required");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("normalises blank description to null", async () => {
    makeUpdateChain();
    await updateTag({ id: "tag-1", description: "   " });
    const setArgs = mockSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArgs.description).toBeNull();
  });
});

describe("updateTagDescription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes a null description when given null", async () => {
    makeUpdateChain();
    await updateTagDescription("tag-1", null);

    const setArgs = mockSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArgs.description).toBeNull();
  });
});

describe("deleteTag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes when no posts reference the tag", async () => {
    mockWhere.mockResolvedValueOnce([{ count: 0n }]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    makeDeleteChain();

    const result = await deleteTag("tag-1");

    expect(result).toEqual({ id: "tag-1" });
    expect(mockDelete).toHaveBeenCalledOnce();
  });

  it("throws TagInUseError when posts reference the tag", async () => {
    makeSelectWhere([{ count: 4n }]);

    await expect(deleteTag("tag-1")).rejects.toBeInstanceOf(TagInUseError);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rejects empty id", async () => {
    await expect(deleteTag("   ")).rejects.toThrow("Tag id is required");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("treats string counts as numbers when checking usage", async () => {
    makeSelectWhere([{ count: "1" }]);
    await expect(deleteTag("tag-1")).rejects.toBeInstanceOf(TagInUseError);
  });
});

describe("tagSlugExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when slug exists and excludeId does not match", async () => {
    makeSelectWhere([{ id: "tag-1" }]);
    expect(await tagSlugExists("overland", "tag-2")).toBe(true);
  });

  it("returns false when the only match is excluded by id", async () => {
    makeSelectWhere([{ id: "tag-1" }]);
    expect(await tagSlugExists("overland", "tag-1")).toBe(false);
  });

  it("returns false when no rows match", async () => {
    makeSelectWhere([]);
    expect(await tagSlugExists("missing")).toBe(false);
  });
});

describe("listAllTagsWithCounts (sanity)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns rows with coerced postCount", async () => {
    makeSelectGrouped([
      {
        id: "tag-1",
        name: "Overland",
        slug: "overland",
        description: "Stories",
        postCount: 2n,
      },
    ]);

    const [row] = await listAllTagsWithCounts();

    expect(row).toEqual({
      id: "tag-1",
      name: "Overland",
      slug: "overland",
      description: "Stories",
      postCount: 2,
    });
  });
});
