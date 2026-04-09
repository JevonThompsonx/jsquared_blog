import { expect, test } from "@playwright/test";

const unauthenticatedAdminPaths = ["/admin/tags", "/admin/wishlist"] as const;

test.describe("additional unauthenticated admin route gates", () => {
  for (const adminPath of unauthenticatedAdminPaths) {
    test(`${adminPath} redirects to the admin sign-in shell`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined });

      try {
        const page = await context.newPage();

        await page.goto(adminPath);

        await expect(page).toHaveURL(/\/admin(?:\?.*)?$/, { timeout: 10_000 });
        await expect(page.getByRole("heading", { name: "Editorial control center" })).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Sign in with GitHub" })
            .or(page.getByRole("button", { name: "Configure auth first" })),
        ).toBeVisible();
      } finally {
        await context.close();
      }
    });
  }
});
