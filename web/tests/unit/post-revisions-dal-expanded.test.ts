/**
 * Tests for the expanded post-revision system in Branch 6.
 *
 * Verifies that:
 *  - `restorePostRevisionAtomically` snapshots the new metadata fields (layout,
 *    category, featured image, location) into the pre-restore revision, then
 *    writes them back to the live post.
 *  - `getPostColumnCapabilities` advertises the new column flags.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface TxCall {
  kind: "insert" | "update" | "select";
  values?: Record<string, unknown>;
  set?: Record<string, unknown>;
  fields?: Record<string, unknown>;
}

let mockExecute: ReturnType<typeof vi.fn>;
let mockDb: { transaction: ReturnType<typeof vi.fn> };
let txCalls: TxCall[];

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
  getDbClient: vi.fn(() => ({ execute: mockExecute })),
}));

const SNAPSHOT_ROW = {
  title: "Current Title",
  slug: "current-slug",
  contentJson: '{"type":"doc","content":[]}',
  excerpt: "Current excerpt",
  layoutType: "split-horizontal" as const,
  categoryId: "category-current",
  featuredImageId: "media-current",
  locationName: "Lake Louise",
  locationLat: 51.4254,
  locationLng: -116.1773,
  locationZoom: 11,
  songTitle: "Current Song",
  songArtist: "Current Artist",
  songUrl: "https://open.spotify.com/track/current",
};

const REVISION_TO_RESTORE = {
  id: "rev-target",
  postId: "post-1",
  revisionNum: 5,
  title: "Historical Title",
  contentJson: '{"type":"doc","content":[]}',
  excerpt: "Historical excerpt",
  layoutType: "hover" as const,
  categoryId: "category-historical",
  featuredImageId: "media-historical",
  locationName: "Banff",
  locationLat: 51.1784,
  locationLng: -115.5708,
  locationZoom: 9,
  songTitle: "Old Song",
  songArtist: "Old Artist",
  songUrl: "https://open.spotify.com/track/old",
  savedByUserId: "admin-1",
  savedAt: new Date(),
  label: null,
};

function makeTxMock() {
  return {
    insert: vi.fn(() => ({
      values: vi.fn((v: Record<string, unknown>) => {
        txCalls.push({ kind: "insert", values: v });
        return Promise.resolve();
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((set: Record<string, unknown>) => {
        txCalls.push({ kind: "update", set });
        return { where: vi.fn().mockResolvedValue(undefined) };
      }),
    })),
    select: vi.fn((fields?: Record<string, unknown>) => {
      const next: TxCall = { kind: "select" };
      if (fields) next.fields = { ...fields };
      txCalls.push(next);
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([SNAPSHOT_ROW]),
          })),
        })),
      };
    }),
  };
}

function setupMocks({
  withSongCapabilities = true,
  withExpandedColumns = true,
}: { withSongCapabilities?: boolean; withExpandedColumns?: boolean } = {}) {
  txCalls = [];
  mockExecute = vi.fn();

  const rows: Array<{ name: string }> = [{ name: "ioverlander_url" }, { name: "view_count" }];
  if (withExpandedColumns) {
    rows.unshift(
      { name: "layout_type" },
      { name: "category_id" },
      { name: "featured_image_id" },
      { name: "location_name" },
      { name: "location_lat" },
      { name: "location_lng" },
      { name: "location_zoom" },
    );
  }
  if (withSongCapabilities) {
    rows.unshift({ name: "song_title" }, { name: "song_artist" }, { name: "song_url" });
  }
  mockExecute.mockResolvedValue({ rows });

  const txMock = makeTxMock();
  mockDb = {
    transaction: vi.fn(async (fn: (tx: ReturnType<typeof makeTxMock>) => Promise<unknown>) => fn(txMock)),
  };
}

async function loadModule<T = unknown>(path: string = "@/server/dal/post-revisions"): Promise<T> {
  vi.resetModules();
  return import(path) as Promise<T>;
}

type RevisionsModule = typeof import("@/server/dal/post-revisions");
type TxCallValues = NonNullable<TxCall["values"]>;
type TxCallSet = NonNullable<TxCall["set"]>;

describe("restorePostRevisionAtomically (expanded Branch 6 fields)", () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("snapshots every expanded post metadata field into the pre-restore revision", async () => {
    const { restorePostRevisionAtomically } = await loadModule<RevisionsModule>();

    await restorePostRevisionAtomically({
      postId: "post-1",
      revision: REVISION_TO_RESTORE,
      derivedContent: {
        canonicalContentJson: REVISION_TO_RESTORE.contentJson,
        contentHtml: "<p>Hi</p>",
        contentPlainText: "Hi",
        excerpt: "Derived excerpt",
      },
      savedByUserId: "admin-1",
    });

    const preRestoreInsert = txCalls.find((c) => c.kind === "insert");
    const preRestoreValues: TxCallValues | undefined = preRestoreInsert?.values;
    expect(preRestoreInsert).toBeDefined();
    expect(preRestoreValues).toMatchObject({
      postId: "post-1",
      title: SNAPSHOT_ROW.title,
      contentJson: SNAPSHOT_ROW.contentJson,
      excerpt: SNAPSHOT_ROW.excerpt,
      layoutType: SNAPSHOT_ROW.layoutType,
      categoryId: SNAPSHOT_ROW.categoryId,
      featuredImageId: SNAPSHOT_ROW.featuredImageId,
      locationName: SNAPSHOT_ROW.locationName,
      locationLat: SNAPSHOT_ROW.locationLat,
      locationLng: SNAPSHOT_ROW.locationLng,
      locationZoom: SNAPSHOT_ROW.locationZoom,
      songTitle: SNAPSHOT_ROW.songTitle,
      songArtist: SNAPSHOT_ROW.songArtist,
      songUrl: SNAPSHOT_ROW.songUrl,
    });
    expect(String(preRestoreValues?.label)).toMatch(/^Before restore to revision /);
  });

  it("writes the historical revision's layout, category, featured image, and location back onto the post", async () => {
    const { restorePostRevisionAtomically } = await loadModule<RevisionsModule>();

    await restorePostRevisionAtomically({
      postId: "post-1",
      revision: REVISION_TO_RESTORE,
      derivedContent: {
        canonicalContentJson: REVISION_TO_RESTORE.contentJson,
        contentHtml: "<p>Hi</p>",
        contentPlainText: "Hi",
        excerpt: "Derived excerpt",
      },
      savedByUserId: "admin-1",
    });

    const postUpdate = txCalls.find((c) => c.kind === "update");
    const postUpdateSet: TxCallSet | undefined = postUpdate?.set;
    expect(postUpdate).toBeDefined();
    expect(postUpdateSet).toMatchObject({
      title: REVISION_TO_RESTORE.title,
      layoutType: REVISION_TO_RESTORE.layoutType,
      categoryId: REVISION_TO_RESTORE.categoryId,
      featuredImageId: REVISION_TO_RESTORE.featuredImageId,
      locationName: REVISION_TO_RESTORE.locationName,
      locationLat: REVISION_TO_RESTORE.locationLat,
      locationLng: REVISION_TO_RESTORE.locationLng,
      locationZoom: REVISION_TO_RESTORE.locationZoom,
    });
  });

  it("includes the new fields in the snapshot select so the pre-restore revision captures them", async () => {
    const { restorePostRevisionAtomically } = await loadModule<RevisionsModule>();

    await restorePostRevisionAtomically({
      postId: "post-1",
      revision: REVISION_TO_RESTORE,
      derivedContent: {
        canonicalContentJson: REVISION_TO_RESTORE.contentJson,
        contentHtml: "<p>Hi</p>",
        contentPlainText: "Hi",
        excerpt: "Derived excerpt",
      },
      savedByUserId: "admin-1",
    });

    const snapshotSelect = txCalls.find((c) => c.kind === "select" && c.fields && "title" in c.fields);
    expect(snapshotSelect).toBeDefined();
    expect(snapshotSelect?.fields).toHaveProperty("layoutType");
    expect(snapshotSelect?.fields).toHaveProperty("categoryId");
    expect(snapshotSelect?.fields).toHaveProperty("featuredImageId");
    expect(snapshotSelect?.fields).toHaveProperty("locationName");
    expect(snapshotSelect?.fields).toHaveProperty("locationLat");
    expect(snapshotSelect?.fields).toHaveProperty("locationLng");
    expect(snapshotSelect?.fields).toHaveProperty("locationZoom");
  });

  it("omits new post fields from the snapshot select and update set when capabilities are missing", async () => {
    setupMocks({ withSongCapabilities: false, withExpandedColumns: false });

    const { restorePostRevisionAtomically } = await loadModule<RevisionsModule>();

    await restorePostRevisionAtomically({
      postId: "post-1",
      revision: REVISION_TO_RESTORE,
      derivedContent: {
        canonicalContentJson: REVISION_TO_RESTORE.contentJson,
        contentHtml: "<p>Hi</p>",
        contentPlainText: "Hi",
        excerpt: "Derived excerpt",
      },
      savedByUserId: "admin-1",
    });

    const snapshotSelect = txCalls.find((c) => c.kind === "select" && c.fields && "title" in c.fields);
    expect(snapshotSelect).toBeDefined();
    expect(snapshotSelect?.fields).toHaveProperty("layoutType");
    expect(snapshotSelect?.fields).toHaveProperty("categoryId");
    expect(snapshotSelect?.fields).toHaveProperty("featuredImageId");

    const postUpdate = txCalls.find((c) => c.kind === "update");
    const postUpdateSet: TxCallSet | undefined = postUpdate?.set;
    expect(postUpdate).toBeDefined();
    expect(postUpdateSet).not.toHaveProperty("layoutType");
    expect(postUpdateSet).not.toHaveProperty("categoryId");
    expect(postUpdateSet).not.toHaveProperty("featuredImageId");
    expect(postUpdateSet).not.toHaveProperty("locationName");
    expect(postUpdateSet).not.toHaveProperty("songTitle");
  });

  it("returns null when the post does not exist", async () => {
    const { restorePostRevisionAtomically } = await loadModule<RevisionsModule>();

    const txMock = {
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
        })),
      })),
    };
    mockDb = {
      transaction: vi.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
    };

    const result = await restorePostRevisionAtomically({
      postId: "missing",
      revision: REVISION_TO_RESTORE,
      derivedContent: {
        canonicalContentJson: REVISION_TO_RESTORE.contentJson,
        contentHtml: "<p>Hi</p>",
        contentPlainText: "Hi",
        excerpt: null,
      },
      savedByUserId: "admin-1",
    });

    expect(result).toBeNull();
  });
});

describe("getPostColumnCapabilities advertises new Branch 6 fields", () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exposes categoryId and featuredImageId flags in addition to the existing capabilities", async () => {
    const { getPostColumnCapabilities } = await loadModule<typeof import("@/server/dal/post-column-capabilities")>(
      "@/server/dal/post-column-capabilities",
    );
    const caps = await getPostColumnCapabilities();
    expect(caps).toHaveProperty("categoryId");
    expect(caps).toHaveProperty("featuredImageId");
    expect(typeof caps.categoryId).toBe("boolean");
    expect(typeof caps.featuredImageId).toBe("boolean");
  });

  it("treats categoryId and featuredImageId as unavailable when the schema inspect call fails", async () => {
    mockExecute.mockRejectedValue(new Error("table info unavailable"));
    const { getPostColumnCapabilities } = await loadModule<typeof import("@/server/dal/post-column-capabilities")>(
      "@/server/dal/post-column-capabilities",
    );
    const caps = await getPostColumnCapabilities();
    expect(caps.categoryId).toBe(false);
    expect(caps.featuredImageId).toBe(false);
  });
});
