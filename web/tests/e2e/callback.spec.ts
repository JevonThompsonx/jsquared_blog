import { expect, test } from "@playwright/test";

test.describe("public auth callback route", () => {
  test("missing verification state lands in the bounded callback failure shell", async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });

    try {
      const page = await context.newPage();

      await page.goto("/callback");

      await expect(page).toHaveURL(/\/callback(?:\?|$)/);
      await expect(page.getByRole("heading", { name: "Verification failed" })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/link may have expired\./i)).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
    } finally {
      await context.close();
    }
  });
});
