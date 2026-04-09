import { expect, test } from "@playwright/test";

import { loadEnvironmentFiles } from "@/lib/env-loader";

loadEnvironmentFiles();

const publicEmail = process.env.E2E_PUBLIC_EMAIL?.trim() || "";
const publicPassword = process.env.E2E_PUBLIC_PASSWORD?.trim() || "";
const publicPostSlug = process.env.E2E_PUBLIC_POST_SLUG?.trim() || "";

test.describe("post login return path", () => {
  test("signing in from the bookmark gate returns to the post with bookmark controls unlocked", async ({ page }) => {
    test.skip(
      !publicEmail || !publicPassword || !publicPostSlug,
      "Run bun run seed:e2e to provision public fixture credentials and a public post slug for live post login coverage.",
    );

    const postPath = `/posts/${publicPostSlug}`;

    await page.goto(postPath);

    const signInToSaveLink = page.getByRole("link", { name: "Sign in to save this post" });
    await expect(signInToSaveLink).toBeVisible({ timeout: 15_000 });
    await expect(signInToSaveLink).toHaveAttribute("href", `/login?redirectTo=${encodeURIComponent(postPath)}`);

    await signInToSaveLink.click();

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByLabel("Email").fill(publicEmail);
    await page.getByLabel("Password").fill(publicPassword);

    await Promise.all([
      page.waitForURL(new RegExp(`${postPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), { timeout: 20_000 }),
      page.getByRole("button", { name: "Sign in" }).click(),
    ]);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save this post" }).or(page.getByRole("button", { name: "Remove bookmark from this post" })),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "Sign in to save this post" })).toHaveCount(0);
  });

  test("signing in from the comments gate returns to the post with the comment composer unlocked", async ({ page }) => {
    test.skip(
      !publicEmail || !publicPassword || !publicPostSlug,
      "Run bun run seed:e2e to provision public fixture credentials and a public post slug for live post login coverage.",
    );

    const postPath = `/posts/${publicPostSlug}`;

    await page.goto(postPath);

    const commentsGate = page.locator("section").filter({ has: page.getByText("Sign in to join the conversation.") });
    const signInLink = commentsGate.getByRole("link", { name: "Sign in" });

    await expect(signInLink).toBeVisible({ timeout: 15_000 });
    await expect(signInLink).toHaveAttribute("href", `/login?redirectTo=${encodeURIComponent(postPath)}`);

    await signInLink.click();

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByLabel("Email").fill(publicEmail);
    await page.getByLabel("Password").fill(publicPassword);

    await Promise.all([
      page.waitForURL(new RegExp(`${postPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`), { timeout: 20_000 }),
      page.getByRole("button", { name: "Sign in" }).click(),
    ]);

    await expect(page.getByRole("heading", { name: /^Comments\s*\(/i })).toBeVisible();
    await expect(page.getByPlaceholder("Share your thoughts...")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Post comment" })).toBeVisible();
    await expect(page.getByText("Sign in to join the conversation.", { exact: true })).toHaveCount(0);
  });
});
