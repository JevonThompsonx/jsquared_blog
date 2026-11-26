import type { Client } from "@libsql/client";

export declare function provisionWorkosAdmins(
  client: Client,
  options?: {
    allowedEmails?: string[];
    apply?: boolean;
    now?: number;
  },
): Promise<{
  examined: number;
  promoted: number;
  profilesCreated: number;
  missing: number;
  blocked: number;
  unchanged: number;
}>;
