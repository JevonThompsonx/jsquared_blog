import { describe, expect, it } from "vitest";

import { shouldWarnAboutMissingCronSecret } from "@/lib/runtime-env";
import { toPostSlug } from "@/lib/utils";

describe("web migration foundations", () => {
  it("builds a stable post slug", () => {
    expect(toPostSlug({ id: "42", title: "Hello, Coastal Trails!", slug: "" })).toBe("42-hello-coastal-trails");
  });

  it("does not warn about missing CRON_SECRET on preview deployments", () => {
    expect(
      shouldWarnAboutMissingCronSecret({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "preview",
      }),
    ).toBe(false);
  });

  it("warns about missing CRON_SECRET on production deployments", () => {
    expect(
      shouldWarnAboutMissingCronSecret({
        NODE_ENV: "production",
        VERCEL: "1",
        VERCEL_ENV: "production",
      }),
    ).toBe(true);
  });
});
