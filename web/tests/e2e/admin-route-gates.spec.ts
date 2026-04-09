import { expect, test } from "@playwright/test";

const unauthenticatedAdminPaths = [
  "/admin/posts/test-post/edit",
  "/admin/posts/test-post/comments",
] as const;

test.describe("unauthenticated admin route gates", () => {
  for (const adminPath of unauthenticatedAdminPaths) {
    test(`${adminPath} redirects to the admin sign-in shell`, async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined });

      try {
        const page = await context.newPage();

        await page.goto(adminPath);

        await expect(page).toHaveURL(/\/admin(?:\?.*)?$/, { timeout: 10_000 });
        await expect(page.getByRole("heading", { name: "Editorial control center" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
      } finally {
        await context.close();
      }
    });
  }
});
