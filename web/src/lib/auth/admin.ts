import "server-only";

import type { DefaultSession, NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

import { getServerEnv } from "@/lib/env";
import { ensureGitHubAdminUser, getAdminAccountByGitHubId } from "@/server/auth/admin-users";

function parseAllowlist(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function canAccessAdmin(identity: { id?: number | string | null }) {
  const env = getServerEnv();
  const idAllowlist = parseAllowlist(env.AUTH_ADMIN_GITHUB_IDS);

  if (idAllowlist.length === 0) {
    return false;
  }

  const id = identity.id?.toString().toLowerCase();

  return Boolean(id && idAllowlist.includes(id));
}

function hasGitHubProviderConfig() {
  const env = getServerEnv();
  return Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET && env.AUTH_SECRET);
}

type AdminToken = {
  userId?: string;
  role?: "reader" | "author" | "admin";
  githubLogin?: string;
  avatarUrl?: string | null;
};

export function buildAdminAuthOptions(): NextAuthOptions {
  const env = getServerEnv();

  if (!hasGitHubProviderConfig()) {
    return {
      secret: env.AUTH_SECRET,
      providers: [],
      session: { strategy: "jwt" },
    };
  }

  const githubClientId = env.AUTH_GITHUB_ID!;
  const githubClientSecret = env.AUTH_GITHUB_SECRET!;

  return {
    secret: env.AUTH_SECRET,
    session: {
      strategy: "jwt",
    },
    pages: {
      signIn: "/admin",
      error: "/admin",
    },
    providers: [
      GitHubProvider({
        clientId: githubClientId,
        clientSecret: githubClientSecret,
      }),
    ],
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider !== "github") {
          return false;
        }

        const githubProfile = profile as {
          id?: number;
          login?: string;
          email?: string | null;
          name?: string | null;
          avatar_url?: string | null;
        };

        if (!githubProfile.id || !githubProfile.login || !canAccessAdmin({ id: githubProfile.id })) {
          return false;
        }

        await ensureGitHubAdminUser({
          providerUserId: String(githubProfile.id),
          login: githubProfile.login,
          email: githubProfile.email ?? null,
          name: githubProfile.name ?? null,
          avatarUrl: githubProfile.avatar_url ?? null,
        });

        return true;
      },
      async jwt({ token, account, profile }) {
        const enrichedToken = token as typeof token & AdminToken;

        if (account?.provider === "github") {
          const githubProfile = profile as {
            id?: number;
            login?: string;
            avatar_url?: string | null;
          };

          if (githubProfile.id) {
            const adminAccount = await getAdminAccountByGitHubId(String(githubProfile.id));
            if (adminAccount) {
              enrichedToken.userId = adminAccount.userId;
              enrichedToken.role = adminAccount.role;
              enrichedToken.githubLogin = githubProfile.login ?? adminAccount.login;
              enrichedToken.avatarUrl = githubProfile.avatar_url ?? adminAccount.avatarUrl;
            }
          }
        }

        return enrichedToken;
      },
      async session({ session, token }) {
        const enrichedToken = token as typeof token & AdminToken;
        const enrichedSession = session as DefaultSession & {
          user: DefaultSession["user"] & {
            id?: string;
            role?: "reader" | "author" | "admin";
            githubLogin?: string;
            avatarUrl?: string | null;
          };
        };

        if (enrichedSession.user) {
          enrichedSession.user.id = enrichedToken.userId;
          enrichedSession.user.role = enrichedToken.role;
          enrichedSession.user.githubLogin = enrichedToken.githubLogin;
          enrichedSession.user.avatarUrl = enrichedToken.avatarUrl ?? null;
        }

        return enrichedSession;
      },
      async redirect({ url, baseUrl }) {
        if (url.startsWith("/")) {
          return `${baseUrl}${url}`;
        }

        if (new URL(url).origin === baseUrl) {
          return url;
        }

        return `${baseUrl}/admin`;
      },
    },
  };
}

export function isAdminAuthConfigured() {
  return hasGitHubProviderConfig();
}
