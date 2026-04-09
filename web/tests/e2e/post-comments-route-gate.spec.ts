import { expect, test } from "@playwright/test";

import { configuredPublicPostSlug } from "./helpers/public";

test.describe("logged-out post comments gate", () => {
  test("published post comments prompt sign-in with a return path", async ({ browser }) => {
    test.skip(!configuredPublicPostSlug, "Run bun run seed:e2e to provision the public E2E post slug.");

    const postPath = `/posts/${configuredPublicPostSlug}`;

    const context = await browser.newContext({ storageState: undefined });

    try {
      const page = await context.newPage();

      await page.goto(postPath);

      await expect(page.getByRole("heading", { name: /^Comments\s*\(/i })).toBeVisible();
      const commentsGate = page.locator("section").filter({ has: page.getByText("Sign in to join the conversation.") });

      await expect(commentsGate.getByText("Sign in to join the conversation.")).toBeVisible();
      await expect(page.getByPlaceholder("Share your thoughts...")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Post comment" })).toHaveCount(0);
      await expect(commentsGate.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        `/login?redirectTo=${encodeURIComponent(postPath)}`,
      );
      await expect(commentsGate.getByRole("link", { name: "Create account" })).toHaveAttribute(
        "href",
        `/signup?redirectTo=${encodeURIComponent(postPath)}`,
      );
    } finally {
      await context.close();
    }
  });
});
