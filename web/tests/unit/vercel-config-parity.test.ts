import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type VercelConfig = {
  crons?: Array<{
    path: string;
    schedule: string;
  }>;
};

function readVercelConfig(relativePath: string): VercelConfig {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8")) as VercelConfig;
}

describe("vercel cron config parity", () => {
  it("keeps root and web cron schedules aligned", () => {
    const rootConfig = readVercelConfig("../../../vercel.json");
    const webConfig = readVercelConfig("../../vercel.json");

    expect(rootConfig.crons).toEqual(webConfig.crons);
  });
});
