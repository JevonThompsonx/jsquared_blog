import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let capturedSelection: Record<string, unknown> | null = null;
let mockDb: { select: ReturnType<typeof vi.fn> };
let mockExecute: ReturnType<typeof vi.fn>;

function setupDbMocks() {
  capturedSelection = null;
  mockExecute = vi.fn();

  const queryChain: Record<string, ReturnType<typeof vi.fn>> = {} as Record<string, ReturnType<typeof vi.fn>>;
  queryChain.leftJoin = vi.fn(() => queryChain);
  queryChain.where = vi.fn(() => queryChain);
  queryChain.orderBy = vi.fn(() => queryChain);
  queryChain.offset = vi.fn(() => queryChain);
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
  vi.doMock("@/lib/db", () => ({
    getDb: vi.fn(() => mockDb),
    getDbClient: vi.fn(() => ({ execute: mockExecute })),
  }));

  return import(path) as Promise<T>;
}

describe("post column capability detection", () => {
  beforeEach(() => {
    setupDbMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("@/lib/db");
  });

  it("marks song metadata columns as unavailable when they are missing locally", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        { name: "layout_type" },
        { name: "location_name" },
        { name: "location_lat" },
        { name: "location_lng" },
        { name: "location_zoom" },
        { name: "ioverlander_url" },
        { name: "view_count" },
      ],
    });

    const { getPostColumnCapabilities } = await loadModule<typeof import("@/server/dal/post-column-capabilities")>(
      "@/server/dal/post-column-capabilities",
    );

    await expect(getPostColumnCapabilities()).resolves.toEqual({
      layoutType: true,
      locationName: true,
      locationLat: true,
      locationLng: true,
      locationZoom: true,
      iovanderUrl: true,
      songTitle: false,
      songArtist: false,
      songUrl: false,
      viewCount: true,
    });
  });

  it("falls back to all optional columns being unavailable when schema inspection fails", async () => {
    mockExecute.mockRejectedValue(new Error("table info unavailable"));

    const { getPostColumnCapabilities } = await loadModule<typeof import("@/server/dal/post-column-capabilities")>(
      "@/server/dal/post-column-capabilities",
    );

    await expect(getPostColumnCapabilities()).resolves.toEqual({
      layoutType: false,
      locationName: false,
      locationLat: false,
      locationLng: false,
      locationZoom: false,
      iovanderUrl: false,
      songTitle: false,
      songArtist: false,
      songUrl: false,
      viewCount: false,
    });
  });

  it("uses null fallbacks instead of missing song columns in published post queries", async () => {
    mockExecute.mockResolvedValue({
      rows: [
        { name: "layout_type" },
        { name: "location_name" },
        { name: "location_lat" },
        { name: "location_lng" },
        { name: "location_zoom" },
        { name: "ioverlander_url" },
        { name: "view_count" },
      ],
    });

    const { listPublishedPostRecords } = await loadModule<typeof import("@/server/dal/posts")>("@/server/dal/posts");
    const { posts } = await import("@/drizzle/schema");

    await listPublishedPostRecords(20, 0);

    expect(capturedSelection).not.toBeNull();
    expect(capturedSelection?.layoutType).toBe(posts.layoutType);
    expect(capturedSelection?.iovanderUrl).toBe(posts.iovanderUrl);
    expect(capturedSelection?.viewCount).toBe(posts.viewCount);
    expect(capturedSelection?.songTitle).not.toBe(posts.songTitle);
    expect(capturedSelection?.songArtist).not.toBe(posts.songArtist);
    expect(capturedSelection?.songUrl).not.toBe(posts.songUrl);
  });
});
