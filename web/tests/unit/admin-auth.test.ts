import { afterEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";

vi.mock("@/lib/env", () => ({
  getServerEnv: vi.fn(() => ({
    AUTH_SECRET: "abcdefghijklmnopqrstuvwxyz123456",
    AUTH_GITHUB_ID: "github-client-id",
    AUTH_GITHUB_SECRET: "github-client-secret",
    AUTH_ADMIN_GITHUB_IDS: "12345",
  })),
}));

vi.mock("@/server/auth/admin-users", () => ({
  ensureGitHubAdminUser: vi.fn(),
  getAdminAccountByGitHubId: vi.fn(),
}));

import { buildAdminAuthOptions } from "@/lib/auth/admin";
import { getAdminAccountByGitHubId } from "@/server/auth/admin-users";

type JwtCallback = NonNullable<NonNullable<ReturnType<typeof buildAdminAuthOptions>["callbacks"]>["jwt"]>;

describe("buildAdminAuthOptions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keeps githubLogin sourced from the GitHub profile login", async () => {
    vi.mocked(getAdminAccountByGitHubId).mockResolvedValue({
      userId: "github-user-12345",
      role: "admin",
      displayName: "Jevon + Jessica",
      avatarUrl: "/images/us.webp",
      email: "admin@example.com",
      providerUserId: "12345",
    });

    const options = buildAdminAuthOptions();
    const jwtCallback = options.callbacks?.jwt as JwtCallback;
    const token = await jwtCallback({
      token: {} as JWT,
      account: { provider: "github", type: "oauth", providerAccountId: "12345" },
      profile: {
        id: 12345,
        login: "octocat",
        email: "admin@example.com",
        name: "The Octocat",
        avatar_url: "https://avatars.example.com/octocat.png",
      } as Record<string, unknown>,
      user: {
        id: "github-user-12345",
        email: "admin@example.com",
      },
      trigger: "signIn",
      isNewUser: false,
      session: undefined,
    });

    expect(token).toMatchObject({
      userId: "github-user-12345",
      role: "admin",
      githubLogin: "octocat",
      avatarUrl: "https://avatars.example.com/octocat.png",
    });
  });
});
