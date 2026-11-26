import { describe, expect, it } from "vitest";

import { hasFatalWorkosIdentityFindings } from "../../scripts/audit-workos-identity.mjs";

const cleanReport = {
  users: 5,
  profiles: 5,
  workosAccounts: 5,
  duplicateNormalizedEmails: 0,
  duplicateProviderSubjects: 0,
  legacyWorkosLinks: 0,
  orphanWorkosLinks: 0,
  allowlistedNonAdmins: 0,
  providerEmailMismatch: 0,
  providerEmailMissing: 0,
  duplicateWorkosLinksPerUser: 0,
  allowlistedAdminsWithoutWorkos: 0,
  adminEmailsNotAllowlisted: 0,
};

describe("WorkOS identity audit severity", () => {
  it("treats provider-email and parity warnings as non-fatal", () => {
    expect(
      hasFatalWorkosIdentityFindings({
        ...cleanReport,
        providerEmailMissing: 1,
        allowlistedAdminsWithoutWorkos: 1,
        adminEmailsNotAllowlisted: 1,
      }),
    ).toBe(false);
  });

  it.each([
    "duplicateNormalizedEmails",
    "duplicateProviderSubjects",
    "legacyWorkosLinks",
    "orphanWorkosLinks",
    "allowlistedNonAdmins",
    "providerEmailMismatch",
    "duplicateWorkosLinksPerUser",
  ] as const)("treats %s as fatal", (field) => {
    expect(hasFatalWorkosIdentityFindings({ ...cleanReport, [field]: 1 })).toBe(
      true,
    );
  });
});
