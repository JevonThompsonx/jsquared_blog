import type { Client } from "@libsql/client";

export interface LedgerRow {
  rowid: number | null;
  id: number | null;
  hash: string;
  createdAt: number;
}

export declare function resolveMigrationsFolder(cwd?: string): string;

export declare function readLedgerRows(client: Client): Promise<LedgerRow[]>;

export declare function countDuplicateNormalizedEmails(
  client: Client,
): Promise<number>;

export declare function preflightNormalizedEmailUniqueness(
  client: Client,
  migrationsFolder?: string,
): Promise<{ checked: boolean; duplicates: number }>;

export declare function resolveDatabaseConfig(
  env?: NodeJS.ProcessEnv,
): { url: string; authToken?: string };

export declare function runMigrations(options?: {
  client?: Client;
  databaseUrl?: string;
  authToken?: string;
  migrationsFolder?: string;
  log?: (message: string) => void;
}): Promise<{
  applied: number;
  total: number;
  ledgerCount: number;
  latestHash: string | null;
}>;

export declare function main(): Promise<void>;
