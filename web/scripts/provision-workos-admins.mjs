#!/usr/bin/env node
/**
 * Provision local admin rows for ADMIN_ALLOWED_EMAILS without WorkOS secrets.
 * Dry-run by default; pass --apply to write. Existing users keep their IDs.
 */

import { createHash } from "node:crypto";
import { createClient } from "@libsql/client";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

function normalizeEmails(allowedEmails) {
  return [
    ...new Set(
      allowedEmails
        .map((email) => email.trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    ),
  ].sort();
}

function localAdminId(email) {
  const digest = createHash("sha256").update(email).digest("hex");
  return `workos-admin-${digest.slice(0, 24)}`;
}

async function buildPlan(client, emails) {
  const plan = [];
  for (const email of emails) {
    const result = await client.execute({
      sql: `select u.id, u.role, p.user_id as profile_id
            from users u left join profiles p on p.user_id = u.id
            where lower(u.primary_email) = ? limit 1`,
      args: [email],
    });
    const row = result.rows[0];
    plan.push({
      email,
      userId: row ? String(row.id) : localAdminId(email),
      created: !row,
      promoted: Boolean(row && String(row.role) !== "admin"),
      profileCreated: !row?.profile_id,
    });
  }
  return plan;
}

function summarize(plan) {
  return {
    examined: plan.length,
    created: plan.filter((entry) => entry.created).length,
    promoted: plan.filter((entry) => entry.promoted).length,
    profilesCreated: plan.filter((entry) => entry.profileCreated).length,
    unchanged: plan.filter(
      (entry) => !entry.created && !entry.promoted && !entry.profileCreated,
    ).length,
  };
}

export async function provisionWorkosAdmins(
  client,
  { allowedEmails, apply = false, now = Date.now() } = {},
) {
  const emails = normalizeEmails(allowedEmails ?? []);
  const plan = await buildPlan(client, emails);
  if (!apply) return summarize(plan);

  const transaction = await client.transaction("write");
  try {
    for (const entry of plan) {
      if (entry.created) {
        await transaction.execute({
          sql: `insert into users
                (id, primary_email, name, email_verified, role, created_at, updated_at)
                values (?, ?, '', 1, 'admin', ?, ?)`,
          args: [entry.userId, entry.email, now, now],
        });
      } else if (entry.promoted) {
        await transaction.execute({
          sql: "update users set role = 'admin', updated_at = ? where id = ?",
          args: [now, entry.userId],
        });
      }
      if (entry.profileCreated) {
        await transaction.execute({
          sql: `insert into profiles
                (user_id, display_name, created_at, updated_at)
                values (?, ?, ?, ?) on conflict(user_id) do nothing`,
          args: [entry.userId, entry.email.split("@")[0], now, now],
        });
      }
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  return summarize(plan);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply")) {
    throw new Error(
      "Usage: node scripts/provision-workos-admins.mjs [--apply]",
    );
  }
  const envPath = process.env.WORKOS_ENV_FILE;
  if (envPath && existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false, quiet: true });
  }
  const databaseUrl = process.env.TURSO_DATABASE_URL;
  if (!databaseUrl) throw new Error("TURSO_DATABASE_URL is required");
  const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS ?? "").split(
    /[,\s]+/,
  );
  if (normalizeEmails(allowedEmails).length === 0) {
    throw new Error(
      "ADMIN_ALLOWED_EMAILS must contain at least one valid email",
    );
  }
  const client = createClient({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  try {
    const apply = args.includes("--apply");
    const report = await provisionWorkosAdmins(client, {
      allowedEmails,
      apply,
    });
    console.info(
      JSON.stringify({ mode: apply ? "apply" : "dry-run", ...report }),
    );
  } finally {
    client.close();
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Admin provisioning failed",
    );
    process.exitCode = 1;
  });
}
