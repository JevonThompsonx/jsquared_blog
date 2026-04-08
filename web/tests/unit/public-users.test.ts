import type { User } from "@supabase/supabase-js";

import { afterEach, describe, expect, it, vi } from "vitest";

import { authAccounts, profiles, users } from "@/drizzle/schema";

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

  it("returns an existing linked user without rewriting records when the profile row exists", async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: "supabase-user-supabase-user-1",
        email: "reader@example.com",
        displayName: "Trail Reader",
        avatarUrl: "https://cdn.example.com/avatar.png",
        supabaseUserId: "supabase-user-1",
      },
    ]);
    mockProfileLimit.mockResolvedValueOnce([{ userId: "supabase-user-supabase-user-1" }]);

    const result = await ensurePublicAppUser(makeSupabaseUser());

    expect(result).toEqual({
      id: "supabase-user-supabase-user-1",
      supabaseUserId: "supabase-user-1",
      email: "reader@example.com",
      displayName: "Trail Reader",
      avatarUrl: "https://cdn.example.com/avatar.png",
    });
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
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
    expect(mockInsert).toHaveBeenNthCalledWith(1, users);
    expect(mockValues).toHaveBeenNthCalledWith(1, expect.objectContaining({
      id: "supabase-user-supabase-user-1",
      primaryEmail: "reader@example.com",
      role: "reader",
    }));
    expect(mockInsert).toHaveBeenNthCalledWith(2, profiles);
    expect(mockValues).toHaveBeenNthCalledWith(2, expect.objectContaining({
      userId: "supabase-user-supabase-user-1",
      displayName: "Reader",
      avatarUrl: null,
    }));
    expect(mockInsert).toHaveBeenNthCalledWith(3, authAccounts);
    expect(mockValues).toHaveBeenNthCalledWith(3, expect.objectContaining({
      id: "supabase-account-supabase-user-1",
      userId: "supabase-user-supabase-user-1",
      provider: "supabase",
      providerUserId: "supabase-user-1",
      providerEmail: "reader@example.com",
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: users.id,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      target: profiles.userId,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(3, expect.objectContaining({
      target: authAccounts.id,
    }));
  });

  it("creates a fallback email when Supabase does not provide one", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const result = await ensurePublicAppUser({
      ...makeSupabaseUser("supabase-user-2"),
      email: undefined,
    });

    expect(result).toEqual({
      id: "supabase-user-supabase-user-2",
      supabaseUserId: "supabase-user-2",
      email: "supabase-user-2@users.supabase.local",
      displayName: "Reader",
      avatarUrl: null,
    });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(3);
    expect(mockInsert).toHaveBeenNthCalledWith(1, users);
    expect(mockValues).toHaveBeenNthCalledWith(1, expect.objectContaining({
      id: "supabase-user-supabase-user-2",
      primaryEmail: "supabase-user-2@users.supabase.local",
      role: "reader",
    }));
    expect(mockInsert).toHaveBeenNthCalledWith(2, profiles);
    expect(mockValues).toHaveBeenNthCalledWith(2, expect.objectContaining({
      userId: "supabase-user-supabase-user-2",
      displayName: "Reader",
      avatarUrl: null,
    }));
    expect(mockInsert).toHaveBeenNthCalledWith(3, authAccounts);
    expect(mockValues).toHaveBeenNthCalledWith(3, expect.objectContaining({
      id: "supabase-account-supabase-user-2",
      userId: "supabase-user-supabase-user-2",
      provider: "supabase",
      providerUserId: "supabase-user-2",
      providerEmail: null,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: users.id,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      target: profiles.userId,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(3, expect.objectContaining({
      target: authAccounts.id,
    }));
  });

  it("prefers trimmed user_name metadata for the display name and avatar", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const result = await ensurePublicAppUser({
      ...makeSupabaseUser("supabase-user-3"),
      user_metadata: {
        user_name: "  TrailGuide  ",
        preferred_username: "preferred-guide",
        full_name: "Full Guide",
        name: "Guide Name",
        avatar_url: "  https://cdn.example.com/trail-guide.png  ",
      },
    });

    expect(result).toEqual({
      id: "supabase-user-supabase-user-3",
      supabaseUserId: "supabase-user-3",
      email: "reader@example.com",
      displayName: "TrailGuide",
      avatarUrl: "https://cdn.example.com/trail-guide.png",
    });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(3);
    expect(mockInsert).toHaveBeenNthCalledWith(1, users);
    expect(mockValues).toHaveBeenNthCalledWith(1, expect.objectContaining({
      id: "supabase-user-supabase-user-3",
      primaryEmail: "reader@example.com",
      role: "reader",
    }));
    expect(mockInsert).toHaveBeenNthCalledWith(2, profiles);
    expect(mockValues).toHaveBeenNthCalledWith(2, expect.objectContaining({
      userId: "supabase-user-supabase-user-3",
      displayName: "TrailGuide",
      avatarUrl: "https://cdn.example.com/trail-guide.png",
    }));
    expect(mockInsert).toHaveBeenNthCalledWith(3, authAccounts);
    expect(mockValues).toHaveBeenNthCalledWith(3, expect.objectContaining({
      id: "supabase-account-supabase-user-3",
      userId: "supabase-user-supabase-user-3",
      provider: "supabase",
      providerUserId: "supabase-user-3",
      providerEmail: "reader@example.com",
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: users.id,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      target: profiles.userId,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(3, expect.objectContaining({
      target: authAccounts.id,
    }));
  });

  it("falls back to a stable default identity when email and usable metadata are missing", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const result = await ensurePublicAppUser({
      ...makeSupabaseUser("supabase-user-4"),
      email: undefined,
      user_metadata: {
        user_name: "   ",
        preferred_username: "",
        full_name: "   ",
        name: "",
        avatar_url: "   ",
      },
    });

    expect(result).toEqual({
      id: "supabase-user-supabase-user-4",
      supabaseUserId: "supabase-user-4",
      email: "supabase-user-4@users.supabase.local",
      displayName: "Traveler",
      avatarUrl: null,
    });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledTimes(3);
    expect(mockInsert).toHaveBeenNthCalledWith(1, users);
    expect(mockValues).toHaveBeenNthCalledWith(1, expect.objectContaining({
      id: "supabase-user-supabase-user-4",
      primaryEmail: "supabase-user-4@users.supabase.local",
      role: "reader",
    }));
    expect(mockInsert).toHaveBeenNthCalledWith(2, profiles);
    expect(mockValues).toHaveBeenNthCalledWith(2, expect.objectContaining({
      userId: "supabase-user-supabase-user-4",
      displayName: "Traveler",
      avatarUrl: null,
    }));
    expect(mockInsert).toHaveBeenNthCalledWith(3, authAccounts);
    expect(mockValues).toHaveBeenNthCalledWith(3, expect.objectContaining({
      id: "supabase-account-supabase-user-4",
      userId: "supabase-user-supabase-user-4",
      provider: "supabase",
      providerUserId: "supabase-user-4",
      providerEmail: null,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: users.id,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      target: profiles.userId,
    }));
    expect(mockOnConflictDoUpdate).toHaveBeenNthCalledWith(3, expect.objectContaining({
      target: authAccounts.id,
    }));
  });

  it("falls back to the email local-part when metadata is blank", async () => {
    mockLimit.mockResolvedValueOnce([]);

    const result = await ensurePublicAppUser({
      ...makeSupabaseUser("supabase-user-5"),
      email: "reader@example.com",
      user_metadata: {
        user_name: "   ",
        preferred_username: "",
        full_name: "   ",
        name: "",
        avatar_url: "",
      },
    });

    expect(result).toEqual({
      id: "supabase-user-supabase-user-5",
      supabaseUserId: "supabase-user-5",
      email: "reader@example.com",
      displayName: "reader",
      avatarUrl: null,
    });
  });
});
