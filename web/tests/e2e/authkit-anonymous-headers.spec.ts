import { expect, test } from "@playwright/test";

test.describe("AuthKit anonymous response headers", () => {
  test("ordinary anonymous HTML does not receive PKCE cookies or no-store", async ({
    request,
  }) => {
    const response = await request.get("/about", {
      headers: { Accept: "text/html" },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["set-cookie"]).toBeUndefined();
    // Next dev always marks dynamic renders no-store. The packaged-production
    // smoke script asserts the deployment cache header with the real SDK.
    if (process.env.E2E_AUTHKIT_PRODUCTION_SMOKE === "1") {
      expect(response.headers()["cache-control"] ?? "").not.toContain(
        "no-store",
      );
    }
  });

  test("a real login initiation still redirects with a PKCE verifier cookie", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/auth/login?returnTo=%2Fbookmarks",
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain(
      "api.workos.com/user_management/authorize",
    );
    expect(response.headers()["set-cookie"]).toMatch(/wos-auth-verifier/);
  });
});
