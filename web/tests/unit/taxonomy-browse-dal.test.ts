import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockLeftJoin = vi.fn();
const mockGroupBy = vi.fn();
const mockOrderBy = vi.fn();

const dbMock = {
  select: mockSelect,
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
  categories: {
    id: "id",
    name: "name",
    slug: "slug",
    description: "description",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  postTags: {
    postId: "post_id",
    tagId: "tag_id",
  },
  posts: {
    id: "id",
    status: "status",
    categoryId: "category_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  asc: vi.fn((col) => ({ op: "asc", col })),
  count: vi.fn((col) => ({ op: "count", col })),
  desc: vi.fn((col) => ({ op: "desc", col })),
  eq: vi.fn((col, val) => ({ op: "eq", col, val })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray) => ({ op: "sql", strings })),
    { raw: vi.fn((value: string) => ({ op: "sql_raw", value })) },
  ),
}));

import { listAllCategoriesForBrowse, listAllTagsForBrowse } from "@/server/dal/taxonomy-browse";

function buildSelectChain(terminal: unknown) {
  mockOrderBy.mockReturnValue(terminal);
  mockGroupBy.mockReturnValue({ orderBy: mockOrderBy });
  mockLeftJoin.mockReturnValue({ groupBy: mockGroupBy });
  mockFrom.mockReturnValue({ leftJoin: mockLeftJoin });
  mockSelect.mockReturnValue({ from: mockFrom });
}

describe("listAllTagsForBrowse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped tag records with numeric post counts and date conversion", async () => {
    const now = Date.now();
    buildSelectChain([
      {
        id: "tag-1",
        name: "Backpacking",
        slug: "backpacking",
        description: "Multi-day hiking stories.",
        createdAt: now,
        updatedAt: now,
        postCount: 3,
      },
      {
        id: "tag-2",
        name: "Van Life",
        slug: "van-life",
        description: null,
        createdAt: now,
        updatedAt: now,
        postCount: 0,
      },
    ]);

    const result = await listAllTagsForBrowse();

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("tag-1");
    expect(result[0]!.postCount).toBe(3);
    expect(result[0]!.description).toBe("Multi-day hiking stories.");
    expect(result[0]!.createdAt).toBeInstanceOf(Date);
    expect(result[0]!.updatedAt).toBeInstanceOf(Date);
    expect(result[1]!.description).toBeNull();
    expect(result[1]!.postCount).toBe(0);
  });

  it("preserves Date objects passed directly from the driver", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-02-01T00:00:00.000Z");
    buildSelectChain([
      {
        id: "tag-1",
        name: "Backpacking",
        slug: "backpacking",
        description: null,
        createdAt,
        updatedAt,
        postCount: 1,
      },
    ]);

    const result = await listAllTagsForBrowse();

    expect(result[0]!.createdAt).toBe(createdAt);
    expect(result[0]!.updatedAt).toBe(updatedAt);
  });

  it("returns an empty array when the database has no tags", async () => {
    buildSelectChain([]);

    const result = await listAllTagsForBrowse();

    expect(result).toEqual([]);
  });

  it("queries with a LEFT JOIN against post_tags and a GROUP BY on the tag id", async () => {
    buildSelectChain([]);

    await listAllTagsForBrowse();

    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockFrom).toHaveBeenCalledOnce();
    expect(mockLeftJoin).toHaveBeenCalledOnce();
    expect(mockGroupBy).toHaveBeenCalledOnce();
    expect(mockOrderBy).toHaveBeenCalledOnce();
  });
});

describe("listAllCategoriesForBrowse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped category records with numeric published post counts", async () => {
    const now = Date.now();
    buildSelectChain([
      {
        id: "cat-1",
        name: "Hiking",
        slug: "hiking",
        description: "Trail adventures.",
        createdAt: now,
        updatedAt: now,
        postCount: 4,
      },
      {
        id: "cat-2",
        name: "Road Trips",
        slug: "road-trips",
        description: null,
        createdAt: now,
        updatedAt: now,
        postCount: 0,
      },
    ]);

    const result = await listAllCategoriesForBrowse();

    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe("cat-1");
    expect(result[0]!.postCount).toBe(4);
    expect(result[0]!.description).toBe("Trail adventures.");
    expect(result[0]!.createdAt).toBeInstanceOf(Date);
    expect(result[1]!.postCount).toBe(0);
  });

  it("returns an empty array when the database has no categories", async () => {
    buildSelectChain([]);

    const result = await listAllCategoriesForBrowse();

    expect(result).toEqual([]);
  });

  it("queries with a LEFT JOIN against posts and a GROUP BY on the category id", async () => {
    buildSelectChain([]);

    await listAllCategoriesForBrowse();

    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockFrom).toHaveBeenCalledOnce();
    expect(mockLeftJoin).toHaveBeenCalledOnce();
    expect(mockGroupBy).toHaveBeenCalledOnce();
    expect(mockOrderBy).toHaveBeenCalledOnce();
  });
});
