import { expect } from "@playwright/test";

import {
  configuredPublicPostSlug,
  getPublicStorageStateHint,
  hasPublicStorageState,
  publicTest,
} from "./helpers/public";

publicTest.describe("authenticated public-user flows", () => {
  publicTest.skip(!hasPublicStorageState, getPublicStorageStateHint());

  publicTest("signed-in user can save a post and see it in bookmarks", async ({ page }) => {
    publicTest.skip(!configuredPublicPostSlug, "Run bun run seed:e2e to provision the public E2E post slug.");

    await page.goto(`/posts/${configuredPublicPostSlug}`);

    const bookmarkButton = page.getByRole("button", { name: "Save this post" });
    await expect(bookmarkButton).toBeVisible({ timeout: 15_000 });
    await bookmarkButton.click();

    await expect(page.getByRole("button", { name: "Remove bookmark from this post" })).toBeVisible();

    await page.goto("/bookmarks");

    await expect(page.getByRole("heading", { name: "Saved posts" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Read: E2E Admin Fixture Post/i })).toBeVisible();
  });
});
