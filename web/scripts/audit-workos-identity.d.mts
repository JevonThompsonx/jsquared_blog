import type { Client } from "@libsql/client";

export interface WorkosIdentityAuditReport {
  users: number;
  profiles: number;
  workosAccounts: number;
  duplicateNormalizedEmails: number;
  duplicateProviderSubjects: number;
  legacyWorkosLinks: number;
  orphanWorkosLinks: number;
  allowlistedNonAdmins: number;
  providerEmailMismatch: number;
  providerEmailMissing: number;
  duplicateWorkosLinksPerUser: number;
  allowlistedAdminsWithoutWorkos: number;
  adminEmailsNotAllowlisted: number;
}

export declare function auditWorkosIdentity(
  client: Client,
  options?: { allowedEmails?: string[] },
): Promise<WorkosIdentityAuditReport>;

export declare function hasFatalWorkosIdentityFindings(
  report: WorkosIdentityAuditReport,
): boolean;
