import { expect } from "@playwright/test";

import {
  adminTest,
  getAdminStorageStateHint,
  hasAdminStorageState,
} from "./helpers/admin";
import { skipIfDummyDbEnv } from "./helpers/db-env-guard";

skipIfDummyDbEnv();

const canRunAuthenticatedFlows = hasAdminStorageState;

adminTest.describe("authenticated bookmarks error states", () => {
  adminTest.skip(!canRunAuthenticatedFlows, getAdminStorageStateHint());

  adminTest(
    "signed-in users fall back to the sign-in prompt when bookmark loading is unauthorized",
    async ({ page }) => {
      await page.route("**/api/bookmarks", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unauthorized" }),
        });
      });

      await page.goto("/bookmarks");

      await expect(
        page.getByRole("heading", { name: "Saved posts" }),
      ).toBeVisible();
      await expect(
        page.getByText("Sign in to see your saved posts", { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/login?redirectTo=/bookmarks",
      );
      await expect(
        page.getByText("Failed to load saved posts", { exact: true }),
      ).toHaveCount(0);
    },
  );

  adminTest(
    "signed-in users see a bounded retry shell when bookmark loading fails",
    async ({ page }) => {
      await page.route("**/api/bookmarks", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Failed to load bookmarks" }),
        });
      });

      await page.goto("/bookmarks");

      await expect(
        page.getByRole("heading", { name: "Saved posts" }),
      ).toBeVisible();
      await expect(
        page.getByText("Failed to load saved posts", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Please refresh and try again.", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText("Sign in to see your saved posts", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("No saved posts yet", { exact: true }),
      ).toHaveCount(0);
    },
  );
});
