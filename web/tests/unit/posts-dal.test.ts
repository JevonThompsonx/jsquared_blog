import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockInnerJoin = vi.fn();
const mockLeftJoin = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockOffset = vi.fn();
const mockLimit = vi.fn();

const dbMock = {
  select: mockSelect,
};

vi.mock("@/lib/db", () => ({
  getDb: () => dbMock,
}));

vi.mock("@/server/dal/post-column-capabilities", () => ({
  getPostColumnCapabilities: vi.fn().mockResolvedValue({
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
  }),
}));

vi.mock("@/drizzle/schema", () => ({
  posts: {
    id: "id",
    title: "title",
    slug: "slug",
    contentJson: "content_json",
    contentFormat: "content_format",
    contentHtml: "content_html",
    contentPlainText: "content_plain_text",
    excerpt: "excerpt",
    status: "status",
    layoutType: "layout_type",
    publishedAt: "published_at",
    scheduledPublishTime: "scheduled_publish_time",
    authorId: "author_id",
    categoryId: "category_id",
    seriesId: "series_id",
    seriesOrder: "series_order",
    featuredImageId: "featured_image_id",
    externalGalleryUrl: "external_gallery_url",
    externalGalleryLabel: "external_gallery_label",
    locationName: "location_name",
    locationLat: "location_lat",
    locationLng: "location_lng",
    locationZoom: "location_zoom",
    iovanderUrl: "ioverlander_url",
    songTitle: "song_title",
    songArtist: "song_artist",
    songUrl: "song_url",
    viewCount: "view_count",
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
    slug: "slug",
  },
  comments: {
    id: "id",
    postId: "post_id",
  },
  postImages: {
    id: "id",
    postId: "post_id",
  },
}));

interface CapturedEq {
  col: unknown;
  val: unknown;
}

const capturedEqCalls: CapturedEq[] = [];

vi.mock("drizzle-orm", () => {
  const eq = vi.fn((col: unknown, val: unknown) => {
    capturedEqCalls.push({ col, val });
    return { op: "eq", col, val };
  });
  return {
    and: vi.fn((...clauses: unknown[]) => ({ op: "and", clauses })),
    count: vi.fn(() => ({ op: "count_star" })),
    desc: vi.fn((col: unknown) => ({ op: "desc", col })),
    eq,
    inArray: vi.fn((col: unknown, vals: unknown) => ({ op: "inArray", col, vals })),
    ne: vi.fn((col: unknown, val: unknown) => ({ op: "ne", col, val })),
    sql: Object.assign(
      vi.fn((strings: TemplateStringsArray) => ({ op: "sql", strings })),
      { raw: vi.fn((value: string) => ({ op: "sql_raw", value })) },
    ),
  };
});

import {
  countPublishedPostsByCategory,
  listPublishedPostRecordsByCategory,
} from "@/server/dal/posts";

function buildPostsByCategoryChain(terminal: unknown) {
  mockLimit.mockReturnValue(terminal);
  mockOffset.mockReturnValue({ limit: mockLimit });
  mockOrderBy.mockReturnValue({ offset: mockOffset });
  mockWhere.mockReturnValue({ orderBy: mockOrderBy });
  mockLeftJoin.mockReturnValue({ where: mockWhere });
  mockInnerJoin.mockReturnValue({ leftJoin: mockLeftJoin });
  mockFrom.mockReturnValue({ innerJoin: mockInnerJoin });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function buildCountByCategoryChain(terminal: unknown) {
  mockWhere.mockResolvedValue(terminal);
  mockInnerJoin.mockReturnValue({ where: mockWhere });
  mockFrom.mockReturnValue({ innerJoin: mockInnerJoin });
  mockSelect.mockReturnValue({ from: mockFrom });
}

describe("listPublishedPostRecordsByCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedEqCalls.length = 0;
  });

  it("queries by the category slug (not the display name) and returns mapped posts", async () => {
    const now = new Date();
    buildPostsByCategoryChain([
      {
        id: "post-1",
        slug: "post-1",
        title: "First",
        excerpt: null,
        contentJson: null,
        contentFormat: "tiptap-json",
        contentHtml: null,
        contentPlainText: null,
        category: "Van Life",
        imageUrl: null,
        layoutType: "standard",
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        locationName: null,
        locationLat: null,
        locationLng: null,
        locationZoom: null,
        iovanderUrl: null,
        songTitle: null,
        songArtist: null,
        songUrl: null,
        viewCount: 0,
      },
    ]);

    const result = await listPublishedPostRecordsByCategory("van-life", 20, 0);

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("post-1");
    expect(result[0]!.category).toBe("Van Life");

    const slugMatch = capturedEqCalls.find(
      (call) => call.col === "slug" && call.val === "van-life",
    );
    expect(slugMatch).toBeDefined();
    const nameMatch = capturedEqCalls.find(
      (call) => call.col === "name" && call.val === "van-life",
    );
    expect(nameMatch).toBeUndefined();
  });

  it("also filters by published status using the post status column", async () => {
    buildPostsByCategoryChain([]);

    await listPublishedPostRecordsByCategory("van-life", 20, 0);

    const statusMatch = capturedEqCalls.find(
      (call) => call.col === "status" && call.val === "published",
    );
    expect(statusMatch).toBeDefined();
  });
});

describe("countPublishedPostsByCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedEqCalls.length = 0;
  });

  it("queries by the category slug (not the display name) and returns the count", async () => {
    buildCountByCategoryChain([{ n: 7n }]);

    const result = await countPublishedPostsByCategory("van-life");

    expect(result).toBe(7);

    const slugMatch = capturedEqCalls.find(
      (call) => call.col === "slug" && call.val === "van-life",
    );
    expect(slugMatch).toBeDefined();
    const nameMatch = capturedEqCalls.find(
      (call) => call.col === "name" && call.val === "van-life",
    );
    expect(nameMatch).toBeUndefined();
  });

  it("coerces a missing count row to zero", async () => {
    buildCountByCategoryChain([]);

    const result = await countPublishedPostsByCategory("van-life");

    expect(result).toBe(0);
  });

  it("also filters by published status using the post status column", async () => {
    buildCountByCategoryChain([{ n: 0n }]);

    await countPublishedPostsByCategory("van-life");

    const statusMatch = capturedEqCalls.find(
      (call) => call.col === "status" && call.val === "published",
    );
    expect(statusMatch).toBeDefined();
  });
});
