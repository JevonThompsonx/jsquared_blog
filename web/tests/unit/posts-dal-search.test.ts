import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockSelectDistinct = vi.fn();

const dbMock = {
  select: mockSelect,
  selectDistinct: mockSelectDistinct,
};

vi.mock("@/lib/db", () => ({
  getDb: () => dbMock,
  getDbClient: () => ({
    execute: vi.fn(),
  }),
}));

vi.mock("@/drizzle/schema", () => ({
  posts: {
    id: "id",
    slug: "slug",
    title: "title",
    excerpt: "excerpt",
    contentJson: "content_json",
    contentFormat: "content_format",
    contentHtml: "content_html",
    contentPlainText: "content_plain_text",
    status: "status",
    categoryId: "category_id",
    featuredImageId: "featured_image_id",
    publishedAt: "published_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  categories: {
    id: "id",
    name: "name",
  },
  mediaAssets: {
    id: "id",
    secureUrl: "secure_url",
  },
  postTags: {
    postId: "post_id",
    tagId: "tag_id",
  },
  tags: {
    id: "id",
    name: "name",
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ kind: "and", args })),
  desc: vi.fn((col: unknown) => ({ kind: "desc", col })),
  eq: vi.fn((col: unknown, val: unknown) => ({ kind: "eq", col, val })),
  or: vi.fn((...args: unknown[]) => ({ kind: "or", args })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ kind: "sql", strings, values })),
    { raw: vi.fn((s: string) => ({ kind: "sql-raw", value: s })) },
  ),
}));

import { searchPublishedPostRecords } from "@/server/dal/posts";
import { escapeLikePattern } from "@/server/dal/posts";

vi.mock("@/server/dal/post-column-capabilities", () => ({
  getPostColumnCapabilities: vi.fn(async () => ({
    layoutType: true,
    categoryId: true,
    featuredImageId: true,
    locationName: true,
    locationLat: true,
    locationLng: true,
    locationZoom: true,
    iovanderUrl: true,
    songTitle: true,
    songArtist: true,
    songUrl: true,
    viewCount: true,
  })),
}));

function makeQueryChain(terminal: unknown[] = [], useDistinct = false) {
  const chain = {
    from: vi.fn(),
    leftJoin: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };

  chain.from.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  // offset is called before limit, so offset must return the chain (for limit())
  chain.offset.mockReturnValue(chain);
  chain.limit.mockReturnValue(terminal);

  if (useDistinct) {
    mockSelectDistinct.mockReturnValue(chain);
  } else {
    mockSelect.mockReturnValue(chain);
  }
  return chain;
}

describe("searchPublishedPostRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the limit/offset chain when the query is empty", async () => {
    const chain = makeQueryChain([]);

    await searchPublishedPostRecords("", 10, 0);

    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockSelectDistinct).not.toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalledOnce();
    expect(chain.leftJoin).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalledOnce();
    expect(chain.orderBy).toHaveBeenCalledOnce();
    expect(chain.offset).toHaveBeenCalledWith(0);
    expect(chain.limit).toHaveBeenCalledWith(10);
  });

  it("returns the limit/offset chain when the query is whitespace only", async () => {
    const chain = makeQueryChain([]);

    await searchPublishedPostRecords("   ", 10, 0);

    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockSelectDistinct).not.toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalledOnce();
    expect(chain.leftJoin).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalledOnce();
  });

  it("joins categories, mediaAssets, postTags, and tags when searching", async () => {
    const chain = makeQueryChain([], true);

    await searchPublishedPostRecords("sierra", 10, 0);

    expect(mockSelectDistinct).toHaveBeenCalledOnce();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(chain.from).toHaveBeenCalledOnce();
    expect(chain.leftJoin).toHaveBeenCalled();
    expect(chain.where).toHaveBeenCalledOnce();
    expect(chain.orderBy).toHaveBeenCalledOnce();
    expect(chain.limit).toHaveBeenCalledWith(10);
    expect(chain.offset).toHaveBeenCalledWith(0);
  });

  it("includes a search OR clause in the where when the query is non-empty", async () => {
    const chain = makeQueryChain([], true);

    await searchPublishedPostRecords("sierra", 10, 0);

    const whereArgs = (chain.where.mock.calls[0] as unknown[])[0] as {
      kind: string;
      args: Array<{ kind: string }>;
    };
    expect(whereArgs.kind).toBe("and");
    expect(whereArgs.args).toHaveLength(2);
    // The second clause is the OR (for search)
    const searchClause = whereArgs.args[1] as { kind: string; args: Array<{ kind: string }> };
    expect(searchClause.kind).toBe("or");
    // 5 search conditions: title, excerpt, contentPlainText, categories.name, tags.name
    expect(searchClause.args).toHaveLength(5);
  });

  it("encodes the query as a case-insensitive LIKE pattern with wildcards", async () => {
    makeQueryChain([], true);

    await searchPublishedPostRecords("Sierra", 10, 0);

    // All 5 search conditions are sql() tagged templates
    const sqlMock = (await import("drizzle-orm")).sql as unknown as ReturnType<typeof vi.fn>;
    expect(sqlMock).toHaveBeenCalled();
  });

  it("lowercases the query so LIKE matching is case-insensitive", async () => {
    makeQueryChain([], true);

    await searchPublishedPostRecords("VAN LIFE", 10, 0);

    const sqlMock = (await import("drizzle-orm")).sql as unknown as ReturnType<typeof vi.fn>;
    expect(sqlMock).toHaveBeenCalled();
    // Walk all calls; at least one value should be the lowercased pattern.
    const allCalls = sqlMock.mock.calls;
    const flattenedValues = allCalls.flatMap((c) => (c as unknown[]).slice(1));
    const patternUsed = flattenedValues.find((v) => typeof v === "string" && v === "%van life%");
    expect(patternUsed).toBeDefined();
  });

  it("escapes LIKE wildcards in the user query so they are treated as literal text", async () => {
    makeQueryChain([], true);

    await searchPublishedPostRecords("100%_safe", 10, 0);

    const sqlMock = (await import("drizzle-orm")).sql as unknown as ReturnType<typeof vi.fn>;
    // The pattern should contain escaped backslash-prefixed wildcards.
    const flattenedValues = sqlMock.mock.calls.flatMap((c) => (c as unknown[]).slice(1));
    const patternUsed = flattenedValues.find((v) => typeof v === "string" && v.startsWith("%"));
    expect(patternUsed).toBe("%100\\%\\_safe%");
  });

  it("returns the rows the DB resolved with the limit/offset applied", async () => {
    const expected = [
      { id: "post-1", slug: "sierra", title: "Sierra" },
      { id: "post-2", slug: "sierra-2", title: "Sierra 2" },
    ];
    makeQueryChain(expected, true);

    const result = await searchPublishedPostRecords("Sierra", 2, 10);

    expect(result).toEqual(expected);
  });

  // C7: Defense-in-depth length validation at the DAL boundary.
  it("throws when the search query exceeds the maximum length (defense-in-depth)", async () => {
    const tooLong = "x".repeat(201);

    await expect(searchPublishedPostRecords(tooLong, 10, 0)).rejects.toThrow(
      /search query/i,
    );
  });
});

describe("escapeLikePattern (C6: extracted helper)", () => {
  it("escapes the three SQL LIKE wildcards", () => {
    expect(escapeLikePattern("100%_safe\\path")).toBe("100\\%\\_safe\\\\path");
  });

  it("returns the input unchanged when no wildcards are present", () => {
    expect(escapeLikePattern("van life")).toBe("van life");
  });

  it("escapes backslashes BEFORE wildcards (so the escape character itself is literal)", () => {
    // Backslash must be escaped first; otherwise the escaped wildcard
    // sequence `\\%` would become `\\%` (backslash + escape) instead of
    // `\\\\%` (escaped backslash + escaped percent).
    expect(escapeLikePattern("\\")).toBe("\\\\");
  });
});
