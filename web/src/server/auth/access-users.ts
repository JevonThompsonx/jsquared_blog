import "server-only";

import { createHash } from "node:crypto";

import { getDbClient } from "@/lib/db-core";

export type AccessAdminUser = {
  id: string;
  email: string;
  role: "admin";
};

function accessUserId(email: string): string {
  const digest = createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
  return `access-user-${digest.slice(0, 24)}`;
}

/**
 * Find (or create) the local user row that corresponds to a Cloudflare Access
 * identity. Admin writes reference `users.id` as a foreign key, so an Access
 * login needs a real row — using a deterministic id keeps repeated logins
 * pointing at the same author.
 */
export async function ensureAccessAdminUser(
  email: string,
): Promise<AccessAdminUser> {
  const normalized = email.trim().toLowerCase();
  const client = getDbClient();

  const existing = await client.execute({
    sql: "SELECT id FROM users WHERE primary_email = ? LIMIT 1",
    args: [normalized],
  });

  const existingId =
    existing.rows.length > 0 ? String(existing.rows[0].id) : null;
  const userId = existingId ?? accessUserId(normalized);
  const now = Date.now();

  if (!existingId) {
    await client.execute({
      sql: `
        INSERT INTO users (id, primary_email, role, created_at, updated_at)
        VALUES (?, ?, 'admin', ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          primary_email = excluded.primary_email,
          role = 'admin',
          updated_at = excluded.updated_at
      `,
      args: [userId, normalized, now, now],
    });

    await client.execute({
      sql: `
        INSERT INTO profiles (user_id, display_name, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO NOTHING
      `,
      args: [userId, normalized.split("@")[0] ?? normalized, now, now],
    });
  } else {
    await client.execute({
      sql: "UPDATE users SET role = 'admin', updated_at = ? WHERE id = ?",
      args: [now, userId],
    });
  }

  return { id: userId, email: normalized, role: "admin" };
}
