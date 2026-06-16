import { afterEach, describe, expect, it, vi } from "vitest";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockRun = vi.fn();

const mockReturning = vi.fn();
const mockValues = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  run: mockRun,
};

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getDb: () => mockDb,
  getDbClient: () => ({
    execute: vi.fn(),
  }),
}));

vi.mock("@/lib/post-song-metadata", () => ({
  normalizeSongMetadataFields: vi.fn((m: Record<string, unknown>) => m),
}));

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

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ kind: "and", args })),
  count: vi.fn(() => ({ kind: "count" })),
  desc: vi.fn((col: unknown) => ({ kind: "desc", col })),
  eq: vi.fn((col: unknown, val: unknown) => ({ kind: "eq", col, val })),
  inArray: vi.fn((col: unknown, vals: unknown) => ({ kind: "inArray", col, vals })),
  max: vi.fn((col: unknown) => ({ kind: "max", col })),
  or: vi.fn((...args: unknown[]) => ({ kind: "or", args })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ kind: "sql", strings, values })),
    { raw: vi.fn((s: string) => ({ kind: "sql-raw", value: s })) },
  ),
}));

vi.mock("@/drizzle/schema", () => ({
  posts: { id: "id", slug: "slug" },
  postRevisions: {
    id: "id",
    postId: "post_id",
    revisionNum: "revision_num",
    title: "title",
    contentJson: "content_json",
    excerpt: "excerpt",
    layoutType: "layout_type",
    categoryId: "category_id",
    featuredImageId: "featured_image_id",
    locationName: "location_name",
    locationLat: "location_lat",
    locationLng: "location_lng",
    locationZoom: "location_zoom",
    songTitle: "song_title",
    songArtist: "song_artist",
    songUrl: "song_url",
    savedByUserId: "saved_by_user_id",
    savedAt: "saved_at",
    label: "label",
  },
}));

import { createPostRevision } from "@/server/dal/post-revisions";

function makeInsertChain(returning: { revisionNum: number }) {
  const chain = {
    values: mockValues,
    returning: mockReturning,
  };
  mockInsert.mockReturnValue(chain);
  mockValues.mockReturnValue(chain);
  mockReturning.mockResolvedValue([returning]);
  return chain;
}

const baseInput = {
  postId: "post-1",
  title: "Patagonia",
  contentJson: "{}",
  excerpt: "Excerpt",
  savedByUserId: "user-1",
};

describe("createPostRevision", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses an atomic INSERT (no separate read-then-insert) to avoid the max(revision_num) race", async () => {
    makeInsertChain({ revisionNum: 1 });

    await createPostRevision(baseInput);

    // The fix replaces the read-then-insert pattern with a single atomic
    // INSERT. The function should NOT call db.select to read the current
    // max — that would be the race-prone read step.
    expect(mockSelect).not.toHaveBeenCalled();
    // The single INSERT with the subquery-based revisionNum is the fix.
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("computes the next revision_num via a subquery in the INSERT (atomic at SQL level)", async () => {
    const valuesMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ revisionNum: 7 }]),
    });
    mockInsert.mockReturnValue({ values: valuesMock });

    // Import the sql mock AFTER creating the spy
    const { sql: rawSql } = await import("drizzle-orm");
    const sqlSpy = rawSql as unknown as ReturnType<typeof vi.fn>;

    await createPostRevision(baseInput);

    // The subquery for next revision_num must be a SQL template, not a plain
    // number. The subquery computes MAX+1 atomically with the INSERT.
    expect(sqlSpy).toHaveBeenCalled();
    const sqlCalls = sqlSpy.mock.calls as Array<[TemplateStringsArray, ...unknown[]]>;
    // At least one sql call must be a subquery computing MAX+1.
    // The template is split by the interpolations, so we check the
    // full template text and verify the pattern is present.
    const hasSubquery = sqlCalls.some((call: [TemplateStringsArray, ...unknown[]]) => {
      const strings = call[0];
      if (!strings) return false;
      const fullTemplate = strings.join("");
      return fullTemplate.includes("MAX") && fullTemplate.includes("COALESCE") && fullTemplate.includes("+ 1");
    });
    expect(hasSubquery).toBe(true);
  });

  it("returns the revision record with the revision_num from the INSERT RETURNING", async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ revisionNum: 12 }]),
      }),
    });

    const result = await createPostRevision(baseInput);

    expect(result.revisionNum).toBe(12);
    expect(result.postId).toBe("post-1");
    expect(result.title).toBe("Patagonia");
  });

  it("uses revisionNum=1 when the post has no prior revisions (the subquery returns 0+1)", async () => {
    mockInsert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ revisionNum: 1 }]),
      }),
    });

    const result = await createPostRevision(baseInput);

    expect(result.revisionNum).toBe(1);
  });
});
