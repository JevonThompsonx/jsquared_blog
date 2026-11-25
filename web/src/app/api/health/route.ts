import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getEnvSource } from "@/lib/env";
import { getDbClient } from "@/lib/db-core";
import { getLocalMediaRoot } from "@/lib/media/local-storage";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for the local origin.
 *
 * Deliberately reports booleans only: no paths, error strings, versions, or
 * environment values are exposed to an unauthenticated caller.
 */
export async function GET(): Promise<NextResponse> {
  let database = false;
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

  try {
    const root = getLocalMediaRoot();
    await mkdir(root, { recursive: true });
    await access(root, constants.W_OK);
    media = true;
  } catch {
    media = false;
  }

  const healthy = database && media;

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks: {
        database,
        media,
        rateLimitDriver:
          getEnvSource().RATE_LIMIT_DRIVER === "memory" ? "memory" : "upstash",
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
