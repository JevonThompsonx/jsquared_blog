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
  created: number;
  promoted: number;
  profilesCreated: number;
  unchanged: number;
}>;
