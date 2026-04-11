import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests that getAdminEditablePostById respects column capabilities from
 * getPostColumnCapabilities() rather than blindly referencing optional columns
 * that may not exist in the live Turso database.
 *
 * Without the fix, the select statement unconditionally references posts.layoutType,
 * posts.locationName, posts.locationLat, posts.locationLng, posts.locationZoom,
 * posts.iovanderUrl, posts.songTitle, posts.songArtist, posts.songUrl — causing
 * LibSQL to throw "no such column" when those columns haven't been migrated yet.
 */

let capturedSelection: Record<string, unknown> | null = null;
let mockDb: { select: ReturnType<typeof vi.fn> };
let mockExecute: ReturnType<typeof vi.fn>;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
  getDbClient: vi.fn(() => ({ execute: mockExecute })),
}));

function setupDbMocks() {
  capturedSelection = null;
  mockExecute = vi.fn();

  const queryChain: Record<string, ReturnType<typeof vi.fn>> = {} as Record<string, ReturnType<typeof vi.fn>>;
  queryChain.leftJoin = vi.fn(() => queryChain);
  queryChain.where = vi.fn(() => queryChain);
  queryChain.orderBy = vi.fn(() => queryChain);
  queryChain.offset = vi.fn(() => queryChain);
  // Return empty array so function exits early after the first select (post not found)
  queryChain.limit = vi.fn().mockResolvedValue([]);

  const from = vi.fn(() => queryChain);
  const select = vi.fn((selection: Record<string, unknown>) => {
    capturedSelection = selection;
    return { from };
  });

  mockDb = { select };
}

async function loadModule<T>(path: string): Promise<T> {
  vi.resetModules();
  return import(path) as Promise<T>;
}

describe("getAdminEditablePostById column capability guards", () => {
  beforeEach(() => {
    setupDbMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses null fallbacks for optional columns when they are absent from the live database", async () => {
    // PRAGMA returns only the always-present base columns — no optional columns
    mockExecute.mockResolvedValue({ rows: [] });

    const { getAdminEditablePostById } = await loadModule<typeof import("@/server/dal/admin-posts")>(
      "@/server/dal/admin-posts",
    );
    const { posts } = await import("@/drizzle/schema");

    await getAdminEditablePostById("test-id");

    expect(capturedSelection).not.toBeNull();

    // All optional columns must NOT be direct schema column references when unavailable
    expect(capturedSelection?.layoutType).not.toBe(posts.layoutType);
    expect(capturedSelection?.locationName).not.toBe(posts.locationName);
    expect(capturedSelection?.locationLat).not.toBe(posts.locationLat);
    expect(capturedSelection?.locationLng).not.toBe(posts.locationLng);
    expect(capturedSelection?.locationZoom).not.toBe(posts.locationZoom);
    expect(capturedSelection?.iovanderUrl).not.toBe(posts.iovanderUrl);
    expect(capturedSelection?.songTitle).not.toBe(posts.songTitle);
    expect(capturedSelection?.songArtist).not.toBe(posts.songArtist);
    expect(capturedSelection?.songUrl).not.toBe(posts.songUrl);
  });

  it("uses direct column references for optional columns when they exist in the live database", async () => {
    // PRAGMA returns all optional columns as present
    mockExecute.mockResolvedValue({
      rows: [
        { name: "layout_type" },
        { name: "location_name" },
        { name: "location_lat" },
        { name: "location_lng" },
        { name: "location_zoom" },
        { name: "ioverlander_url" },
        { name: "song_title" },
        { name: "song_artist" },
        { name: "song_url" },
        { name: "view_count" },
      ],
    });

    const { getAdminEditablePostById } = await loadModule<typeof import("@/server/dal/admin-posts")>(
      "@/server/dal/admin-posts",
    );
    const { posts } = await import("@/drizzle/schema");

    await getAdminEditablePostById("test-id");

    expect(capturedSelection).not.toBeNull();

    // All optional columns MUST be direct schema column references when available
    expect(capturedSelection?.layoutType).toBe(posts.layoutType);
    expect(capturedSelection?.locationName).toBe(posts.locationName);
    expect(capturedSelection?.locationLat).toBe(posts.locationLat);
    expect(capturedSelection?.locationLng).toBe(posts.locationLng);
    expect(capturedSelection?.locationZoom).toBe(posts.locationZoom);
    expect(capturedSelection?.iovanderUrl).toBe(posts.iovanderUrl);
    expect(capturedSelection?.songTitle).toBe(posts.songTitle);
    expect(capturedSelection?.songArtist).toBe(posts.songArtist);
    expect(capturedSelection?.songUrl).toBe(posts.songUrl);
  });
});
