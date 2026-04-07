import { describe, expect, it } from "vitest";

import { assertSafeSupabaseSeedTarget } from "@/lib/e2e/public-e2e-target-guard";

describe("assertSafeSupabaseSeedTarget", () => {
  it("refuses to seed when the explicit opt-in is missing", () => {
    expect(() => assertSafeSupabaseSeedTarget({
      SUPABASE_URL: "http://127.0.0.1:54321",
    })).toThrow(
      "Refusing to seed the public E2E Supabase fixture without E2E_ALLOW_SUPABASE_SEED=1.",
    );
  });

  it("allows loopback Supabase targets when the explicit opt-in is present", () => {
    expect(assertSafeSupabaseSeedTarget({
      SUPABASE_URL: "http://127.0.0.1:54321",
      E2E_ALLOW_SUPABASE_SEED: "1",
    }).origin).toBe("http://127.0.0.1:54321");
  });

  it("allows IPv6 loopback Supabase targets when the explicit opt-in is present", () => {
    expect(assertSafeSupabaseSeedTarget({
      SUPABASE_URL: "http://[::1]:54321",
      E2E_ALLOW_SUPABASE_SEED: "1",
    }).origin).toBe("http://[::1]:54321");
  });

  it("allows explicitly approved remote Supabase targets when the opt-in is present", () => {
    expect(assertSafeSupabaseSeedTarget({
      SUPABASE_URL: "https://safe-project.supabase.co",
      E2E_ALLOW_SUPABASE_SEED: "1",
      E2E_APPROVED_SUPABASE_URLS: "https://safe-project.supabase.co, https://another-project.supabase.co ",
    }).origin).toBe("https://safe-project.supabase.co");
  });

  it("refuses remote Supabase targets that are not explicitly approved", () => {
    expect(() => assertSafeSupabaseSeedTarget({
      SUPABASE_URL: "https://prod-project.supabase.co",
      E2E_ALLOW_SUPABASE_SEED: "1",
      E2E_APPROVED_SUPABASE_URLS: "https://safe-project.supabase.co",
    })).toThrow(
      "Refusing to seed the public E2E Supabase fixture against an unapproved target: https://prod-project.supabase.co",
    );
  });

  it("refuses approved remote Supabase targets over plain HTTP", () => {
    expect(() => assertSafeSupabaseSeedTarget({
      SUPABASE_URL: "http://safe-project.internal",
      E2E_ALLOW_SUPABASE_SEED: "1",
      E2E_APPROVED_SUPABASE_URLS: "http://safe-project.internal",
    })).toThrow(
      "Refusing to seed the public E2E Supabase fixture against a non-loopback HTTP target: http://safe-project.internal",
    );
  });

  it("fails safely when the Supabase URL is invalid", () => {
    expect(() => assertSafeSupabaseSeedTarget({
      SUPABASE_URL: "not-a-url",
      E2E_ALLOW_SUPABASE_SEED: "1",
    })).toThrow("SUPABASE_URL must be a valid URL before seeding the public E2E Supabase fixture.");
  });
});
