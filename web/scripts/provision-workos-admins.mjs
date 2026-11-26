#!/usr/bin/env node
/**
 * Promote existing local rows for ADMIN_ALLOWED_EMAILS without WorkOS secrets.
 * Dry-run by default; pass --apply to write. Existing users keep their IDs.
 * Missing or conflicting identities are never created or rewritten.
 */

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

async function buildPlan(client, emails) {
  const plan = [];
  for (const email of emails) {
    const result = await client.execute({
      sql: `select u.id, u.role, p.user_id as profile_id
            from users u left join profiles p on p.user_id = u.id
            where lower(u.primary_email) = ? order by u.id`,
      args: [email],
    });
    const rows = result.rows;
    const row = rows[0];
    const missing = rows.length === 0;
    const duplicate = rows.length > 1;
    let blocked = duplicate;
    let profileCreated = false;
    let promoted = false;

    if (row && !blocked) {
      const userId = String(row.id);
      const links = await client.execute({
        sql: `select a.user_id, a.provider_email
              from auth_accounts a
              inner join users u on u.id = a.user_id
              where a.provider = 'workos'
                and ((a.provider_email is not null and lower(trim(a.provider_email)) = ?)
                  or a.user_id = ?)`,
        args: [email, userId],
      });
      blocked = links.rows.some((link) => {
        const providerEmail = link.provider_email;
        return (
          (providerEmail !== null &&
            String(providerEmail).trim().toLowerCase() === email &&
            String(link.user_id) !== userId) ||
          (String(link.user_id) === userId &&
            providerEmail !== null &&
            String(providerEmail).trim().toLowerCase() !== email)
        );
      });
      promoted = !blocked && String(row.role) !== "admin";
      profileCreated = !blocked && !row.profile_id;
    } else if (missing) {
      const competing = await client.execute({
        sql: `select a.user_id
              from auth_accounts a
              inner join users u on u.id = a.user_id
              where a.provider = 'workos'
                and a.provider_email is not null
                and lower(trim(a.provider_email)) = ?
              limit 1`,
        args: [email],
      });
      blocked = competing.rows.length > 0;
    }

    plan.push({
      email,
      userId: row ? String(row.id) : null,
      blocked,
      missing,
      promoted,
      profileCreated,
      unchanged: Boolean(
        row && !blocked && String(row.role) === "admin" && row.profile_id,
      ),
    });
  }
  return plan;
}

function summarize(plan) {
  return {
    examined: plan.length,
    promoted: plan.filter((entry) => entry.promoted).length,
    profilesCreated: plan.filter((entry) => entry.profileCreated).length,
    missing: plan.filter((entry) => entry.missing).length,
    blocked: plan.filter((entry) => entry.blocked).length,
    unchanged: plan.filter((entry) => entry.unchanged).length,
  };
}

export async function provisionWorkosAdmins(
  client,
  { allowedEmails, apply = false, now = Date.now() } = {},
) {
  const emails = normalizeEmails(allowedEmails ?? []);
  const plan = await buildPlan(client, emails);
  const report = summarize(plan);
  if (!apply) return report;
  if (report.missing > 0 || report.blocked > 0) {
    throw new Error(
      "Admin provisioning refused: missing or blocked local identities",
    );
  }

  const transaction = await client.transaction("write");
  try {
    for (const entry of plan) {
      if (entry.promoted) {
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
  return report;
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
