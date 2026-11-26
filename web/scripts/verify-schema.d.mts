import type { Client } from "@libsql/client";

export interface ActualIndex {
  table: string;
  columns: (string | null)[];
  unique: boolean;
}

export interface ActualTable {
  columns: string[];
  indexes: Record<string, { columns: (string | null)[]; unique: boolean }>;
}

export interface DatabaseSchema {
  tables: Record<string, ActualTable>;
  indexesByName: Record<string, ActualIndex>;
  tableCount: number;
  indexCount: number;
}

export interface Snapshot {
  tables?: Record<
    string,
    {
      columns?: Record<string, unknown>;
      indexes?: Record<string, { columns?: string[]; isUnique?: boolean }>;
    }
  >;
}

export declare function loadLatestSnapshot(migrationsFolder?: string): {
  tag: string;
  snapshot: Snapshot;
};

export declare function readDatabaseSchema(
  client: Client,
): Promise<DatabaseSchema>;

export declare function compareDatabaseToSnapshot(
  snapshot: Snapshot,
  actual: DatabaseSchema,
): {
  missingTables: string[];
  missingColumns: string[];
  missingIndexes: string[];
  mismatchedIndexes: string[];
  extraTables: string[];
};

export declare function verifySchema(options: {
  client: Client;
  migrationsFolder?: string;
}): Promise<{
  ok: boolean;
  snapshot: string;
  migrationCount: number;
  ledgerCount: number;
  ledgerHashMismatches: number;
  missingLedgerHashes: number;
  tableCount: number;
  indexCount: number;
  missingTables: string[];
  missingColumns: string[];
  missingIndexes: string[];
  mismatchedIndexes: string[];
  extraTables: string[];
}>;

export declare function main(): Promise<unknown>;
