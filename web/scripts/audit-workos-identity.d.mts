import type { Client } from "@libsql/client";

export declare function auditWorkosIdentity(
  client: Client,
  options?: { allowedEmails?: string[] },
): Promise<{
  users: number;
  profiles: number;
  workosAccounts: number;
  duplicateNormalizedEmails: number;
  duplicateProviderSubjects: number;
  legacyWorkosLinks: number;
  orphanWorkosLinks: number;
  allowlistedNonAdmins: number;
}>;
