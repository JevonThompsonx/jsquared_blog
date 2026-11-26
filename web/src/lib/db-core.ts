import { createClient, type Client, type InStatement } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { getDatabaseEnv } from "@/lib/env";
import * as schema from "@/drizzle/schema";

const TRANSIENT_PATTERNS = [
  "other side closed",
  "Connect Timeout Error",
  "SocketError",
  "failed to list objects",
  "SQLITE_BUSY",
  "database is locked",
];

function isTransientError(err: unknown): boolean {
  const msg = String(err);
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p));
}

function isAuthError(err: unknown): boolean {
  return /\b401\b/.test(String(err)) || /Unauthorized/i.test(String(err));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withDbRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const shouldRetry =
        attempt < maxRetries && isTransientError(err) && !isAuthError(err);
      if (!shouldRetry) throw err;
      const delay = 100 * Math.pow(2, attempt) + Math.random() * 50;
      await sleep(delay);
    }
  }
}

function patchedFetch(): typeof globalThis.fetch {
  return async (input, init) => {
    const response = await globalThis.fetch(input, init);
    if (
      response.body &&
      typeof (response.body as unknown as Record<string, unknown>).cancel !==
        "function"
    ) {
      Object.defineProperty(response.body, "cancel", {
        value: () => {},
        writable: false,
      });
    }
    return response;
  };
}

/**
 * One client per database URL. A remote libSQL connection is cheap to recreate,
 * but a local file connection is not: every `getDb()` used to open a new file
 * handle, which leaks descriptors and defeats SQLite's shared cache.
 *
 * `@libsql/client` for `file:` URLs is a connection pool. The `timeout` option
 * is the SQLite busy timeout and is applied by the native binding when each
 * pooled connection opens, so it covers every borrowed connection — a one-off
 * `PRAGMA busy_timeout` would only configure whichever connection served it.
 */
let cachedClient: { url: string; client: Client } | null = null;

/**
 * Serialize transactions inside this process. `@libsql/client`'s file pool
 * hands each transaction its own connection, and two write transactions from
 * the same client deadlock or fail with SQLITE_BUSY even with a busy timeout.
 * The blog is a single Node process, so an in-process queue is sufficient and
 * removes the failure mode entirely.
 */
function createTransactionQueue() {
  let tail: Promise<void> = Promise.resolve();

  return function acquire(): Promise<() => void> {
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = tail;
    tail = previous.then(() => current);

    return previous.then(() => release);
  };
}

const acquireTransactionSlot = createTransactionQueue();

export function getDbClient(): Client {
  const env = getDatabaseEnv();
  const isFileDatabase = env.TURSO_DATABASE_URL.startsWith("file:");

  if (!env.TURSO_DATABASE_URL || (!isFileDatabase && !env.TURSO_AUTH_TOKEN)) {
    throw new Error(
      "Database is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (or a file: URL).",
    );
  }

  if (cachedClient && cachedClient.url === env.TURSO_DATABASE_URL) {
    return cachedClient.client;
  }

  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
    ...(isFileDatabase ? { timeout: 5000 } : { fetch: patchedFetch() }),
  });

  if (isFileDatabase) {
    // WAL is a persistent database property, so setting it once is enough.
    // Foreign keys are already ON in the libsql native binding (asserted by
    // db-core-local.test.ts); the PRAGMA is repeated for older bindings. Both
    // are intentionally not awaited: the first queries are safe before they
    // finish, and awaiting would make every caller pay for setup.
    void client
      .execute("PRAGMA journal_mode=WAL")
      .then(() => client.execute("PRAGMA foreign_keys=ON"))
      .catch((error: unknown) => {
        console.error("[db] Failed to configure SQLite", error);
      });
  }

  const origExecute = client.execute.bind(client);
  client.execute = ((stmt: InStatement | InStatement[] | string) =>
    withDbRetry(() => origExecute(stmt as never))) as typeof client.execute;

  if (isFileDatabase) {
    const origTransaction = client.transaction.bind(client);
    client.transaction = (async (mode?: "write" | "read" | "deferred") => {
      const release = await acquireTransactionSlot();
      try {
        const transaction = await origTransaction(mode);
        let released = false;
        const releaseOnce = () => {
          if (!released) {
            released = true;
            release();
          }
        };

        const origCommit = transaction.commit.bind(transaction);
        const origRollback = transaction.rollback.bind(transaction);
        const origClose = transaction.close.bind(transaction);

        transaction.commit = async () => {
          try {
            await origCommit();
          } finally {
            releaseOnce();
          }
        };
        transaction.rollback = async () => {
          try {
            await origRollback();
          } finally {
            releaseOnce();
          }
        };
        transaction.close = () => {
          try {
            origClose();
          } finally {
            releaseOnce();
          }
        };

        return transaction;
      } catch (error) {
        release();
        throw error;
      }
    }) as typeof client.transaction;
  }

  cachedClient = { url: env.TURSO_DATABASE_URL, client };
  return client;
}

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cachedDb: { url: string; db: Database } | null = null;

export function getDb(): Database {
  const url = getDatabaseEnv().TURSO_DATABASE_URL ?? "";

  if (cachedDb && cachedDb.url === url) {
    return cachedDb.db;
  }

  const db = drizzle(getDbClient(), { schema });
  cachedDb = { url, db };
  return db;
}

/** Drop the cached client/database. Tests use this after switching env vars. */
export function resetDbClientForTests(): void {
  cachedClient = null;
  cachedDb = null;
}
