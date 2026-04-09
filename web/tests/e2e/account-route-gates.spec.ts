import { expect, test } from "@playwright/test";

test.describe("account route gates", () => {
  test("/account redirects logged-out users to sign-in with a return path", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });

    try {
      const page = await context.newPage();

      await page.goto("/account");

      await expect(page).toHaveURL(/\/login\?redirectTo=\/account$/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Create one" })).toHaveAttribute(
        "href",
        "/signup?redirectTo=%2Faccount",
      );
    } finally {
      await context.close();
    }
  });
});
