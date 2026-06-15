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
  categories: {
    id: "id",
    name: "name",
    slug: "slug",
    description: "description",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  posts: { id: "id", categoryId: "category_id" },
}));

vi.mock("drizzle-orm", () => ({
  asc: vi.fn((col) => ({ kind: "asc", col })),
  count: vi.fn((col) => ({ kind: "count", col })),
  eq: vi.fn((col, val) => ({ col, val })),
}));

import {
  CategoryInUseError,
  CategorySlugConflictError,
  categorySlugExists,
  createCategory,
  deleteCategory,
  getCategoryById,
  getCategoryBySlug,
  listAllCategoriesWithCounts,
  updateCategory,
} from "@/server/dal/categories";

function makeSelectGrouped(rows: unknown[]) {
  mockOrderBy.mockReturnValue(rows);
  mockGroupBy.mockReturnValue({ orderBy: mockOrderBy });
  mockLeftJoin.mockReturnValue({ groupBy: mockGroupBy });
  mockFrom.mockReturnValue({ leftJoin: mockLeftJoin, groupBy: mockGroupBy });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function makeSelectWhereGrouped(rows: unknown[]) {
  mockGroupBy.mockReturnValue(rows);
  mockLeftJoin.mockReturnValue(makeGroupByChain());
  mockFrom.mockReturnValue({ leftJoin: mockLeftJoin });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function makeGroupByChain() {
  // where() returns a chainable that ends in groupBy() so queries like
  // .from().leftJoin().where(...).groupBy(...) resolve to the mock.
  return { where: (() => makeGroupByChain()) as never, groupBy: mockGroupBy };
}

function makeSelectSimpleWhere(rows: unknown[]) {
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

describe("listAllCategoriesWithCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped records with postCount coerced to number", async () => {
    const now = new Date();
    makeSelectGrouped([
      {
        id: "category-1",
        name: "Roads",
        slug: "roads",
        description: "On the road",
        postCount: 5n,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await listAllCategoriesWithCounts();

    expect(result).toEqual([
      {
        id: "category-1",
        name: "Roads",
        slug: "roads",
        description: "On the road",
        postCount: 5,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  });

  it("normalises null description to null", async () => {
    const now = new Date();
    makeSelectGrouped([
      {
        id: "category-2",
        name: "Food",
        slug: "food",
        description: null,
        postCount: 0n,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const [row] = await listAllCategoriesWithCounts();

    expect(row?.description).toBeNull();
    expect(row?.postCount).toBe(0);
  });

  it("coerces string and number timestamps to Date", async () => {
    const tsMs = 1_700_000_000_000;
    makeSelectGrouped([
      {
        id: "category-3",
        name: "History",
        slug: "history",
        description: "Old stuff",
        postCount: "2",
        createdAt: tsMs,
        updatedAt: new Date(tsMs),
      },
    ]);

    const [row] = await listAllCategoriesWithCounts();

    expect(row?.postCount).toBe(2);
    expect(row?.createdAt).toBeInstanceOf(Date);
    expect(row?.createdAt.getTime()).toBe(tsMs);
    expect(row?.updatedAt).toBeInstanceOf(Date);
  });
});

describe("getCategoryBySlug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no matching category", async () => {
    makeSelectWhereGrouped([]);
    const result = await getCategoryBySlug("missing");
    expect(result).toBeNull();
  });

  it("returns the first mapped row when found", async () => {
    const now = new Date();
    makeSelectWhereGrouped([
      {
        id: "category-1",
        name: "Roads",
        slug: "roads",
        description: null,
        postCount: 1n,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await getCategoryBySlug("roads");

    expect(result).toEqual({
      id: "category-1",
      name: "Roads",
      slug: "roads",
      description: null,
      postCount: 1,
      createdAt: now,
      updatedAt: now,
    });
  });
});

describe("getCategoryById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no matching category", async () => {
    makeSelectWhereGrouped([]);
    const result = await getCategoryById("category-x");
    expect(result).toBeNull();
  });
});

describe("categorySlugExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when slug exists and excludeId does not match", async () => {
    makeSelectSimpleWhere([{ id: "category-1" }]);
    const exists = await categorySlugExists("roads", "category-2");
    expect(exists).toBe(true);
  });

  it("returns false when the only match is excluded by id", async () => {
    makeSelectSimpleWhere([{ id: "category-1" }]);
    const exists = await categorySlugExists("roads", "category-1");
    expect(exists).toBe(false);
  });

  it("returns false when no rows match", async () => {
    makeSelectSimpleWhere([]);
    const exists = await categorySlugExists("nope");
    expect(exists).toBe(false);
  });
});

describe("createCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets createdAt and updatedAt to the same value on insert", async () => {
    mockWhere.mockResolvedValue([]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    makeInsertChain();

    const result = await createCategory({ name: "Roads", description: "On the road" });

    expect(result.id).toBe("category-roads");
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(result.updatedAt.getTime());

    expect(mockInsert).toHaveBeenCalledOnce();
    const insertArgs = mockValues.mock.calls[0]![0] as Record<string, unknown>;
    expect(insertArgs.id).toBe("category-roads");
    expect(insertArgs.slug).toBe("roads");
    expect(insertArgs.name).toBe("Roads");
    expect(insertArgs.description).toBe("On the road");
    expect(insertArgs.createdAt).toBeInstanceOf(Date);
    expect(insertArgs.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects blank category names", async () => {
    await expect(createCategory({ name: "   " })).rejects.toThrow("Category name is required");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("throws CategorySlugConflictError when slug is taken", async () => {
    mockWhere.mockResolvedValue([{ id: "category-roads" }]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    await expect(createCategory({ name: "Roads" })).rejects.toBeInstanceOf(CategorySlugConflictError);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("uses provided slug when supplied and trims whitespace", async () => {
    mockWhere.mockResolvedValue([]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    makeInsertChain();

    const result = await createCategory({ name: "Roads", slug: "  custom-slug  " });

    expect(result.id).toBe("category-custom-slug");
    const insertArgs = mockValues.mock.calls[0]![0] as Record<string, unknown>;
    expect(insertArgs.slug).toBe("custom-slug");
  });

  it("normalises blank description to null", async () => {
    mockWhere.mockResolvedValue([]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    makeInsertChain();

    await createCategory({ name: "Roads", description: "   " });

    const insertArgs = mockValues.mock.calls[0]![0] as Record<string, unknown>;
    expect(insertArgs.description).toBeNull();
  });
});

describe("updateCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the updatedAt timestamp and writes the new name/slug/description", async () => {
    mockWhere.mockResolvedValueOnce([]); // categorySlugExists lookup
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    makeUpdateChain();

    const before = Date.now();
    const result = await updateCategory({
      id: "category-1",
      name: "Roads Renamed",
      slug: "roads-renamed",
      description: "Renamed roads",
    });
    const after = Date.now();

    expect(result.id).toBe("category-1");
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.updatedAt.getTime()).toBeLessThanOrEqual(after);

    expect(mockUpdate).toHaveBeenCalledOnce();
    const setArgs = mockSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArgs.name).toBe("Roads Renamed");
    expect(setArgs.slug).toBe("roads-renamed");
    expect(setArgs.description).toBe("Renamed roads");
    expect(setArgs.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects empty id", async () => {
    await expect(updateCategory({ id: "  ", name: "x" })).rejects.toThrow("Category id is required");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects empty name", async () => {
    await expect(updateCategory({ id: "category-1", name: "   " })).rejects.toThrow("Category name is required");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("throws CategorySlugConflictError when slug is taken by a different category", async () => {
    mockWhere.mockResolvedValue([{ id: "category-2" }]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    await expect(updateCategory({ id: "category-1", name: "Roads" })).rejects.toBeInstanceOf(CategorySlugConflictError);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("normalises blank description to null", async () => {
    mockWhere.mockResolvedValueOnce([]); // categorySlugExists lookup
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    makeUpdateChain();

    await updateCategory({ id: "category-1", name: "Roads", description: "   " });

    const setArgs = mockSet.mock.calls[0]![0] as Record<string, unknown>;
    expect(setArgs.description).toBeNull();
  });
});

describe("deleteCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes when no posts reference the category", async () => {
    mockWhere.mockResolvedValueOnce([{ count: 0n }]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    makeDeleteChain();

    const result = await deleteCategory("category-1");

    expect(result).toEqual({ id: "category-1" });
    expect(mockDelete).toHaveBeenCalledOnce();
  });

  it("throws CategoryInUseError when posts reference the category", async () => {
    mockWhere.mockResolvedValue([{ count: 3n }]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    await expect(deleteCategory("category-1")).rejects.toBeInstanceOf(CategoryInUseError);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("rejects empty id", async () => {
    await expect(deleteCategory("   ")).rejects.toThrow("Category id is required");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("treats string post counts as numbers", async () => {
    mockWhere.mockResolvedValue([{ count: "2" }]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });

    await expect(deleteCategory("category-1")).rejects.toBeInstanceOf(CategoryInUseError);
  });
});
