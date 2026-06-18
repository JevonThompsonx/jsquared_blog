import { describe, expect, it } from "vitest";
import { z } from "zod";

import { shouldWarnAboutMissingCronSecret } from "@/lib/runtime-env";
import { toPostSlug } from "@/lib/utils";

describe("AUTH_ADMIN_GITHUB_IDS validation", () => {
  const schema = z.string().optional().transform((val) => {
    if (!val) return undefined;
    const ids = val.split(",").map((s) => s.trim()).filter(Boolean);
    const invalid = ids.filter((id) => !/^\d+$/.test(id));
    if (invalid.length > 0) {
      throw new Error(`AUTH_ADMIN_GITHUB_IDS contains non-numeric IDs: ${invalid.join(", ")}`);
    }
    return ids.join(",");
  });

  it("accepts valid comma-separated numeric IDs", () => {
    expect(schema.parse("123456,789012")).toBe("123456,789012");
  });

  it("throws on non-numeric IDs", () => {
    expect(() => schema.parse("123456,abc")).toThrow("non-numeric IDs: abc");
  });

  it("returns undefined for empty string", () => {
    expect(schema.parse("")).toBeUndefined();
  });
});

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
