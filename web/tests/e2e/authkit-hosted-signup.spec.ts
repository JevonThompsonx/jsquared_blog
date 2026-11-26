import { expect, test } from "@playwright/test";

// Local managed E2E on port 3100 validates pages and redirect initiation only.
// The full hosted AuthKit round-trip smoke uses production via an explicit
// remote HTTPS target. Keep the existing localhost:3000 callback allowlist unchanged.
const hostedSmokeEnabled = process.env.E2E_AUTHKIT_HOSTED_SMOKE === "1";
const rawBaseURL = process.env.E2E_BASE_URL?.trim();
let isRemoteHttps = false;
try {
  const parsed = new URL(rawBaseURL ?? "");
  isRemoteHttps =
    parsed.protocol === "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
} catch {
  isRemoteHttps = false;
}

test.skip(
  !hostedSmokeEnabled || !isRemoteHttps,
  "Set E2E_AUTHKIT_HOSTED_SMOKE=1 and a remote HTTPS E2E_BASE_URL to run the hosted AuthKit smoke.",
);

test("hosted sign-up reaches the AuthKit email screen without requesting a code", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.goto("/signup");
  const main = page.getByRole("main");
  await expect(
    main.getByRole("link", { name: "Continue to sign up" }),
  ).toBeVisible();

  await Promise.all([
    page.waitForURL((url) => /\/sign-up(?:[?#]|$)/.test(url.pathname), {
      timeout: 30_000,
    }),
    main.getByRole("link", { name: "Continue to sign up" }).click(),
  ]);

  await expect(page).not.toHaveURL(/\/api\/auth\/signup(?:[?#]|$)/);
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator("body")).not.toContainText(
    /This site can(?:’|')t be reached|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|Bad Gateway/i,
  );
});
