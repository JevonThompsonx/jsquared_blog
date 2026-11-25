#!/usr/bin/env node
/** Read-only WorkOS/local identity integrity audit. Never prints emails or IDs. */

import { createClient } from "@libsql/client";
import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

function toCount(value) {
  return Number(value ?? 0);
}

export async function auditWorkosIdentity(client, { allowedEmails = [] } = {}) {
  const counts = await client.execute(`
    select
      (select count(*) from users) as users,
      (select count(*) from profiles) as profiles,
      (select count(*) from auth_accounts where provider = 'workos') as workos_accounts
  `);
  const duplicates = await client.execute(`
    select count(*) as n from (
      select lower(primary_email)
      from users
      group by lower(primary_email)
      having count(*) > 1
    )
  `);
  const providerDuplicates = await client.execute(`
    select count(*) as n from (
      select provider, provider_user_id
      from auth_accounts
      group by provider, provider_user_id
      having count(*) > 1
    )
  `);
  const legacy = await client.execute(`
    select count(*) as n
    from auth_accounts a
    inner join users u on u.id = a.user_id
    where a.provider = 'workos'
      and lower(u.primary_email) like '%@legacy.supabase.local'
  `);
  const orphans = await client.execute(`
    select count(*) as n
    from auth_accounts a
    left join users u on u.id = a.user_id
    where a.provider = 'workos' and u.id is null
  `);

  const normalizedAllowed = new Set(
    allowedEmails.map((email) => email.trim().toLowerCase()).filter(Boolean),
  );
  let allowlistedNonAdmins = 0;
  if (normalizedAllowed.size > 0) {
    const users = await client.execute({
      sql: "select lower(primary_email) as email, role from users",
      args: [],
    });
    allowlistedNonAdmins = users.rows.filter(
      (row) =>
        normalizedAllowed.has(String(row.email)) &&
        String(row.role) !== "admin",
    ).length;
  }

  return {
    users: toCount(counts.rows[0]?.users),
    profiles: toCount(counts.rows[0]?.profiles),
    workosAccounts: toCount(counts.rows[0]?.workos_accounts),
    duplicateNormalizedEmails: toCount(duplicates.rows[0]?.n),
    duplicateProviderSubjects: toCount(providerDuplicates.rows[0]?.n),
    legacyWorkosLinks: toCount(legacy.rows[0]?.n),
    orphanWorkosLinks: toCount(orphans.rows[0]?.n),
    allowlistedNonAdmins,
  };
}

async function main() {
  const envPath = process.env.WORKOS_ENV_FILE;
  if (envPath && existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false, quiet: true });
  }
  const databaseUrl = process.env.TURSO_DATABASE_URL;
  if (!databaseUrl) throw new Error("TURSO_DATABASE_URL is required");
  const allowedEmails = (process.env.ADMIN_ALLOWED_EMAILS ?? "").split(
    /[,\s]+/,
  );
  const client = createClient({
    url: databaseUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  try {
    const report = await auditWorkosIdentity(client, { allowedEmails });
    console.info(JSON.stringify(report));
    if (
      report.duplicateNormalizedEmails > 0 ||
      report.duplicateProviderSubjects > 0 ||
      report.legacyWorkosLinks > 0 ||
      report.orphanWorkosLinks > 0 ||
      report.allowlistedNonAdmins > 0
    ) {
      process.exitCode = 2;
    }
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
      error instanceof Error ? error.message : "WorkOS identity audit failed",
    );
    process.exitCode = 1;
  });
}
