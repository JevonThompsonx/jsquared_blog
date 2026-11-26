import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getDbClient } from "@/lib/db-core";
import { getLocalMediaRoot } from "@/lib/media/local-storage";

export const dynamic = "force-dynamic";

/**
 * Indexes the application relies on for authentication, post lookup, and
 * comment rendering. A missing index is silent query degradation or a broken
 * migration, so readiness reports it.
 */
const CRITICAL_INDEXES = [
  "users_primary_email_lower_unique",
  "auth_accounts_provider_subject_unique",
  "posts_slug_unique",
  "posts_status_published_at_idx",
  "comments_post_id_idx",
] as const;

/**
 * Liveness/readiness probe for the local origin.
 *
 * Deliberately reports booleans only: no paths, error strings, versions, or
 * environment values are exposed to an unauthenticated caller.
 */
const WRITE_PROBE_TTL_MS = 10_000;
let cachedWriteProbe: { value: boolean; expiresAt: number } | null = null;
let writeProbeInFlight: Promise<boolean> | null = null;

/**
 * The write probe takes the process-wide SQLite write lock. This endpoint is
 * public and unauthenticated, so collapse concurrent and repeated probes behind
 * a short cache: a flood costs at most one `BEGIN IMMEDIATE` per TTL window
 * instead of starving real writes.
 */
async function probeDatabaseWrite(): Promise<boolean> {
  const now = Date.now();
  if (cachedWriteProbe && now < cachedWriteProbe.expiresAt) {
    return cachedWriteProbe.value;
  }

  if (!writeProbeInFlight) {
    writeProbeInFlight = (async () => {
      try {
        const client = getDbClient();
        const transaction = await client.transaction("write");
        try {
          // A temporary table inside a write transaction proves the database
          // can take writes without persisting anything: ROLLBACK removes it.
          await transaction.execute(
            "create temp table if not exists __health_write_probe (id integer)",
          );
          await transaction.rollback();
          return true;
        } catch {
          await transaction.rollback().catch(() => {});
          return false;
        }
      } catch {
        return false;
      }
    })().finally(() => {
      writeProbeInFlight = null;
    });
  }

  const value = await writeProbeInFlight;
  cachedWriteProbe = { value, expiresAt: Date.now() + WRITE_PROBE_TTL_MS };
  return value;
}

export async function GET(): Promise<NextResponse> {
  let database = false;
  let databaseWrite = false;
  let schema = false;
  let media = false;

  try {
    // Probe a real table: `select 1` also succeeds against a brand-new empty
    // file created by a typo in the database path.
    const result = await getDbClient().execute(
      "select count(*) as n from posts",
    );
    database = Number(result.rows[0]?.n ?? -1) >= 0;
  } catch {
    database = false;
  }

  if (database) {
    try {
      const client = getDbClient();
      const placeholders = CRITICAL_INDEXES.map(() => "?").join(",");
      const result = await client.execute({
        sql: `select count(*) as n from sqlite_master where type = 'index' and name in (${placeholders})`,
        args: [...CRITICAL_INDEXES],
      });
      schema = Number(result.rows[0]?.n ?? 0) === CRITICAL_INDEXES.length;
    } catch {
      schema = false;
    }
  }

  databaseWrite = await probeDatabaseWrite();

  try {
    const root = getLocalMediaRoot();
    await mkdir(root, { recursive: true });
    await access(root, constants.W_OK);
    media = true;
  } catch {
    media = false;
  }

  const healthy = database && databaseWrite && schema && media;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: {
        database,
        databaseWrite,
        schema,
        media,
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
