import { afterEach, describe, expect, it, vi } from "vitest";

const mockExecute = vi.fn();

vi.mock("@/lib/db-core", () => ({
  getDbClient: () => ({
    execute: mockExecute,
  }),
}));

import { ensureGitHubAdminUser, getAdminAccountByGitHubId } from "@/server/auth/admin-users";

describe("admin GitHub identity mapping", () => {
  afterEach(() => {
    mockExecute.mockReset();
  });

  it("normalizes admin identity to the persisted GitHub provider user id", async () => {
    const identity = {
      providerUserId: "12345",
      login: "octocat",
      email: "octocat@example.com",
      name: "The Octocat",
      avatarUrl: "https://avatars.example.com/octocat.png",
    };

    mockExecute.mockResolvedValueOnce({ rows: [] });
    mockExecute.mockResolvedValueOnce({ rows: [] });
    mockExecute.mockResolvedValueOnce({ rows: [] });

    const created = await ensureGitHubAdminUser(identity);

    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          user_id: created.userId,
          role: "admin",
          email: created.email,
          display_name: created.displayName,
          avatar_url: created.avatarUrl,
          provider_user_id: identity.providerUserId,
        },
      ],
    });

    const hydrated = await getAdminAccountByGitHubId(identity.providerUserId);

    expect(created.providerUserId).toBe("12345");
    expect(hydrated).toMatchObject({
      userId: created.userId,
      role: "admin",
      providerUserId: "12345",
    });
  });
});
