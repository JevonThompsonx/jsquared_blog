import "server-only";

import { getDbClient } from "@/lib/db-core";

export type GitHubAdminIdentity = {
  providerUserId: string;
  login: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

export type AdminAccountRecord = {
  userId: string;
  role: "reader" | "author" | "admin";
  displayName: string;
  avatarUrl: string | null;
  email: string;
  providerUserId: string;
};

function now(): number {
  return Date.now();
}

function getGitHubUserId(providerUserId: string): string {
  return `github-user-${providerUserId}`;
}

function getGitHubAccountId(providerUserId: string): string {
  return `github-account-${providerUserId}`;
}

function fallbackEmail(identity: GitHubAdminIdentity): string {
  return identity.email ?? `${identity.login}@users.noreply.github.com`;
}

function parseAdminRole(value: unknown): AdminAccountRecord["role"] | null {
  return value === "reader" || value === "author" || value === "admin" ? value : null;
}

export async function getAdminAccountByGitHubId(providerUserId: string): Promise<AdminAccountRecord | null> {
  const client = getDbClient();
  const result = await client.execute({
    sql: `
      SELECT
        users.id AS user_id,
        users.role AS role,
        users.primary_email AS email,
        profiles.display_name AS display_name,
        profiles.avatar_url AS avatar_url,
        auth_accounts.provider_user_id AS provider_user_id
      FROM auth_accounts
      INNER JOIN users ON users.id = auth_accounts.user_id
      LEFT JOIN profiles ON profiles.user_id = users.id
      WHERE auth_accounts.provider = 'github' AND auth_accounts.provider_user_id = ?
      LIMIT 1
    `,
    args: [providerUserId],
  });

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const role = parseAdminRole(row.role);
  if (!role) {
    return null;
  }

  return {
    userId: String(row.user_id),
    role,
    displayName: String(row.display_name ?? "GitHub Admin"),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    email: String(row.email),
    providerUserId: String(row.provider_user_id),
  };
}

export async function ensureGitHubAdminUser(identity: GitHubAdminIdentity): Promise<AdminAccountRecord> {
  const client = getDbClient();
  const timestamp = now();
  const userId = getGitHubUserId(identity.providerUserId);
  const accountId = getGitHubAccountId(identity.providerUserId);
  const email = fallbackEmail(identity);
  const displayName = "Jevon + Jessica";

  await client.execute({
    sql: `
      INSERT INTO users (id, primary_email, role, created_at, updated_at)
      VALUES (?, ?, 'admin', ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        primary_email = excluded.primary_email,
        role = CASE WHEN users.role = 'admin' THEN 'admin' ELSE excluded.role END,
        updated_at = excluded.updated_at
    `,
    args: [userId, email, timestamp, timestamp],
  });

  await client.execute({
    sql: `
      INSERT INTO profiles (user_id, display_name, avatar_url, bio, theme_preference, created_at, updated_at)
      VALUES (?, ?, ?, NULL, NULL, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = excluded.updated_at
    `,
    args: [userId, displayName, "/images/us.webp", timestamp, timestamp],
  });

  await client.execute({
    sql: `
      INSERT INTO auth_accounts (id, user_id, provider, provider_user_id, provider_email, created_at)
      VALUES (?, ?, 'github', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        user_id = excluded.user_id,
        provider_email = excluded.provider_email
    `,
    args: [accountId, userId, identity.providerUserId, identity.email, timestamp],
  });

  return {
    userId,
    role: "admin",
    displayName,
    avatarUrl: "/images/us.webp",
    email,
    providerUserId: identity.providerUserId,
  };
}
