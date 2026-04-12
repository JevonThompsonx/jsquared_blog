import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests that restorePostRevisionAtomically respects column capabilities from
 * getPostColumnCapabilities() rather than blindly referencing optional song
 * columns that may not exist in the live Turso database.
 *
 * Without the fix, the snapshot SELECT and UPDATE unconditionally reference
 * posts.songTitle, posts.songArtist, posts.songUrl — causing LibSQL to throw
 * "no such column" when those columns haven't been migrated yet.
 */

let capturedSnapshotSelection: Record<string, unknown> | null = null;
let capturedUpdateSet: Record<string, unknown> | null = null;
let mockExecute: ReturnType<typeof vi.fn>;
let mockDb: { transaction: ReturnType<typeof vi.fn> };

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
  getDbClient: vi.fn(() => ({ execute: mockExecute })),
}));

const SNAPSHOT_ROW = {
  title: "Current Title",
  slug: "current-slug",
  contentJson: '{"type":"doc","content":[]}',
  excerpt: "Current excerpt",
  songTitle: "Current Song",
  songArtist: "Current Artist",
  songUrl: "https://open.spotify.com/track/current",
};

const RESTORE_INPUT = {
  postId: "post-1",
  revision: {
    id: "rev-1",
    postId: "post-1",
    revisionNum: 2,
    title: "Revision Title",
    contentJson: '{"type":"doc","content":[]}',
    excerpt: "Revision excerpt",
    songTitle: "Old Song",
    songArtist: "Old Artist",
    songUrl: "https://open.spotify.com/track/old",
    savedByUserId: "admin-1",
    savedAt: new Date(),
    label: null,
  },
  derivedContent: {
    canonicalContentJson: '{"type":"doc","content":[]}',
    contentHtml: "<p>Content</p>",
    contentPlainText: "Content",
    excerpt: "Derived excerpt",
  },
  savedByUserId: "admin-1",
};

function setupMocks() {
  capturedSnapshotSelection = null;
  capturedUpdateSet = null;
  mockExecute = vi.fn();

  const snapshotLimitFn = vi.fn().mockResolvedValue([SNAPSHOT_ROW]);
  const snapshotWhereFn = vi.fn(() => ({ limit: snapshotLimitFn }));
  const snapshotFromFn = vi.fn(() => ({ where: snapshotWhereFn }));

  const maxWhereFn = vi.fn().mockResolvedValue([{ maxNum: 0 }]);
  const maxFromFn = vi.fn(() => ({ where: maxWhereFn }));

  const mockTxSelect = vi.fn((fields?: Record<string, unknown>) => {
    if (fields && "maxNum" in fields) {
      return { from: maxFromFn };
    }
    capturedSnapshotSelection = fields ?? null;
    return { from: snapshotFromFn };
  });

  const mockTxUpdate = vi.fn(() => ({
    set: vi.fn((setObj: Record<string, unknown>) => {
      capturedUpdateSet = setObj;
      return { where: vi.fn().mockResolvedValue(undefined) };
    }),
  }));

  const mockTxInsert = vi.fn(() => ({
    values: vi.fn().mockResolvedValue(undefined),
  }));

  const mockTx = {
    select: mockTxSelect,
    insert: mockTxInsert,
    update: mockTxUpdate,
  };

  mockDb = {
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  };
}

async function loadModule() {
  vi.resetModules();
  return import("@/server/dal/post-revisions");
}

describe("restorePostRevisionAtomically column capability guards", () => {
  beforeEach(() => {
    setupMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("omits song columns from snapshot select and update set when absent from the live database", async () => {
    mockExecute.mockResolvedValue({ rows: [] });

    const { restorePostRevisionAtomically } = await loadModule();
    const { posts } = await import("@/drizzle/schema");

    await restorePostRevisionAtomically(RESTORE_INPUT);

    expect(capturedSnapshotSelection).not.toBeNull();
    expect(capturedSnapshotSelection?.songTitle).not.toBe(posts.songTitle);
    expect(capturedSnapshotSelection?.songArtist).not.toBe(posts.songArtist);
    expect(capturedSnapshotSelection?.songUrl).not.toBe(posts.songUrl);

    expect(capturedUpdateSet).not.toBeNull();
    expect(capturedUpdateSet).not.toHaveProperty("songTitle");
    expect(capturedUpdateSet).not.toHaveProperty("songArtist");
    expect(capturedUpdateSet).not.toHaveProperty("songUrl");
  });

  it("includes direct column refs in snapshot select and song values in update set when columns exist", async () => {
    mockExecute.mockResolvedValue({
      rows: [{ name: "song_title" }, { name: "song_artist" }, { name: "song_url" }],
    });

    const { restorePostRevisionAtomically } = await loadModule();
    const { posts } = await import("@/drizzle/schema");

    await restorePostRevisionAtomically(RESTORE_INPUT);

    expect(capturedSnapshotSelection).not.toBeNull();
    expect(capturedSnapshotSelection?.songTitle).toBe(posts.songTitle);
    expect(capturedSnapshotSelection?.songArtist).toBe(posts.songArtist);
    expect(capturedSnapshotSelection?.songUrl).toBe(posts.songUrl);

    expect(capturedUpdateSet).not.toBeNull();
    expect(capturedUpdateSet).toHaveProperty("songTitle");
    expect(capturedUpdateSet).toHaveProperty("songArtist");
    expect(capturedUpdateSet).toHaveProperty("songUrl");
  });
});
