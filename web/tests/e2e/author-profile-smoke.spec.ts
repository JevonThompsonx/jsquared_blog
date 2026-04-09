import { expect, test } from "@playwright/test";

test.describe("public author profile smoke", () => {
  test("published story author links to the matching public profile", async ({ page }) => {
    await page.goto("/");

    const firstPostLink = page.getByRole("link", { name: /Read post:/i }).first();
    await expect(firstPostLink).toBeVisible({ timeout: 15_000 });

    const postPath = await firstPostLink.getAttribute("href");
    test.skip(!postPath, "No public post links were available to verify author-profile navigation.");

    await page.goto(postPath!);

    const authorLink = page.getByRole("link", { name: /View .*'s profile/i }).first();
    await expect(authorLink).toBeVisible({ timeout: 15_000 });

    const authorPath = await authorLink.getAttribute("href");
    const authorLabel = await authorLink.getAttribute("aria-label");
    const expectedAuthorName = authorLabel?.match(/^View (.+)'s profile$/)?.[1] ?? null;

    expect(authorPath).toMatch(/^\/author\/[A-Za-z0-9_-]+$/);
    expect(expectedAuthorName).toBeTruthy();

    await authorLink.click();

    await expect(page).toHaveURL(new RegExp(`${authorPath?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    await expect(page.getByRole("heading", { level: 1, name: expectedAuthorName ?? undefined })).toBeVisible();
    await expect(page.getByText(/^Member since\b/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent comments" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse stories →" })).toBeVisible();
  });
});
