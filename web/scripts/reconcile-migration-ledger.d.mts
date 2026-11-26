import type { Client } from "@libsql/client";

import type { Snapshot } from "./verify-schema";

export interface MigrationEffects {
  tables: Map<string, string[]>;
  indexes: Map<
    string,
    { table: string; unique: boolean; columns: string[] }
  >;
  unverifiableStatements: number;
}

export declare function extractMigrationEffects(
  statements: string[],
): MigrationEffects;

export declare function findMissingEffects(
  client: Client,
  effects: MigrationEffects,
  snapshot: Snapshot,
): Promise<string[]>;

export declare function reconcileMigrationLedger(options: {
  client: Client;
  migrationsFolder?: string;
  apply?: boolean;
  allowUnverifiable?: boolean;
}): Promise<{
  ok: boolean;
  applied: boolean;
  checked: number;
  legacyHashes: string[];
  missingRows: string[];
  orphanRows: number;
  missingEffects: string[];
  unverifiableMigrations: string[];
  unverifiableStatements: number;
  updatedHashes: number;
  insertedRows: number;
}>;

export declare function main(argv?: string[]): Promise<unknown>;
