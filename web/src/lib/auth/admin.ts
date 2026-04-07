import "server-only";

import type { NextAuthOptions } from "next-auth";
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

type GitHubProfile = {
  id: number | null;
  login: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function parseGitHubProfile(profile: unknown): GitHubProfile | null {
  if (!isRecord(profile)) {
    return null;
  }

  return {
    id: readOptionalNumber(profile["id"]),
    login: readOptionalString(profile["login"]),
    email: readOptionalString(profile["email"]),
    name: readOptionalString(profile["name"]),
    avatarUrl: readOptionalString(profile["avatar_url"]),
  };
}

export function buildAdminAuthOptions(): NextAuthOptions {
  const env = getServerEnv();
  const githubClientId = env.AUTH_GITHUB_ID;
  const githubClientSecret = env.AUTH_GITHUB_SECRET;

  if (!hasGitHubProviderConfig() || !githubClientId || !githubClientSecret) {
    return {
      secret: env.AUTH_SECRET,
      providers: [],
      session: { strategy: "jwt" },
    };
  }

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

        const githubProfile = parseGitHubProfile(profile);

        if (!githubProfile?.id || !githubProfile.login || !canAccessAdmin({ id: githubProfile.id })) {
          return false;
        }

        await ensureGitHubAdminUser({
          providerUserId: String(githubProfile.id),
          login: githubProfile.login,
          email: githubProfile.email ?? null,
          name: githubProfile.name ?? null,
          avatarUrl: githubProfile.avatarUrl ?? null,
        });

        return true;
      },
      async jwt({ token, account, profile }) {
        if (account?.provider === "github") {
          const githubProfile = parseGitHubProfile(profile);

          if (githubProfile?.id) {
            const adminAccount = await getAdminAccountByGitHubId(String(githubProfile.id));
            if (adminAccount) {
              const nextToken: typeof token & AdminToken = token;
              nextToken.userId = adminAccount.userId;
              nextToken.role = adminAccount.role;
              nextToken.githubLogin = githubProfile.login ?? undefined;
              nextToken.avatarUrl = adminAccount.avatarUrl;
            }
          }
        }

        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.userId;
          session.user.role = token.role;
          session.user.githubLogin = token.githubLogin;
          session.user.avatarUrl = token.avatarUrl ?? null;
        }

        return session;
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
