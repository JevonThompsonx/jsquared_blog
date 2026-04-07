import type { User } from "@supabase/supabase-js";

import { afterEach, describe, expect, it, vi } from "vitest";

import { profiles } from "@/drizzle/schema";

const mockLimit = vi.fn();
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockProfileLimit = vi.fn();
const mockProfileWhere = vi.fn(() => ({ limit: mockProfileLimit }));
const mockLeftJoin = vi.fn(() => ({ where: mockWhere }));
const mockInnerJoin = vi.fn(() => ({ leftJoin: mockLeftJoin }));
const mockFrom = vi.fn((table) => {
  if (table === profiles) {
    return { where: mockProfileWhere };
  }

  return { innerJoin: mockInnerJoin };
});
const mockSelect = vi.fn(() => ({ from: mockFrom }));
const mockOnConflictDoUpdate = vi.fn();
const mockValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
const mockInsert = vi.fn(() => ({ values: mockValues }));

const mockTransaction = vi.fn(async (callback: (tx: { insert: typeof mockInsert }) => Promise<void>) => {
  await callback({ insert: mockInsert });
});

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  transaction: mockTransaction,
};

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

import { ensurePublicAppUser } from "@/server/auth/public-users";

function makeSupabaseUser(id = "supabase-user-1"): User {
  return {
    id,
    email: "reader@example.com",
    app_metadata: {},
    user_metadata: { full_name: "Reader" },
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("ensurePublicAppUser", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("repairs a missing profile row for an existing Supabase-linked user", async () => {
    mockLimit
      .mockResolvedValueOnce([
        {
          id: "supabase-user-supabase-user-1",
          email: "reader@example.com",
          displayName: "Traveler",
          avatarUrl: null,
          supabaseUserId: "supabase-user-1",
        },
      ]);
    mockProfileLimit.mockResolvedValueOnce([]);

    const result = await ensurePublicAppUser(makeSupabaseUser());

    expect(result).toEqual({
      id: "supabase-user-supabase-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Reader",
      avatarUrl: null,
    });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(3);
  });
});
