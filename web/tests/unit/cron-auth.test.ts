import { describe, expect, it } from "vitest";

import { requireCronAuthorization } from "@/lib/cron-auth";

describe("requireCronAuthorization", () => {
  it("returns a generic 500 when CRON_SECRET is missing outside local development", async () => {
    const response = requireCronAuthorization(
      new Request("https://preview.example.com/api/cron/publish-scheduled"),
      { NODE_ENV: "production" },
    );

    expect(response?.status).toBe(500);
    await expect(response?.json()).resolves.toEqual({ error: "Internal error" });
  });

  it("allows localhost requests in development when CRON_SECRET is missing", () => {
    const response = requireCronAuthorization(
      new Request("http://localhost/api/cron/publish-scheduled"),
      { NODE_ENV: "development" },
    );

    expect(response).toBeNull();
  });

  it("allows IPv6 loopback requests in development when CRON_SECRET is missing", () => {
    const response = requireCronAuthorization(
      new Request("http://[::1]/api/cron/publish-scheduled"),
      { NODE_ENV: "development" },
    );

    expect(response).toBeNull();
  });

  it("returns unauthorized when the bearer token does not match the configured secret", async () => {
    const response = requireCronAuthorization(
      new Request("https://example.com/api/cron/publish-scheduled", {
        headers: { authorization: "Bearer wrong-token" },
      }),
      { NODE_ENV: "production", CRON_SECRET: "very-secret-token" },
    );

    expect(response?.status).toBe(401);
    await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("allows matching bearer tokens when CRON_SECRET is configured", () => {
    const response = requireCronAuthorization(
      new Request("https://example.com/api/cron/publish-scheduled", {
        headers: { authorization: "Bearer very-secret-token" },
      }),
      { NODE_ENV: "production", CRON_SECRET: "very-secret-token" },
    );

    expect(response).toBeNull();
  });
});
