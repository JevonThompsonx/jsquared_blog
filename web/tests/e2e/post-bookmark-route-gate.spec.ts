import { expect, test } from "@playwright/test";

test.describe("post bookmark route gate", () => {
  test("logged-out readers are sent to sign in to save a post and keep the post return path", async ({ browser, request }) => {
    const homepageResponse = await request.get("/");
    expect(homepageResponse.status()).toBe(200);

    const homepageHtml = await homepageResponse.text();
    const postPath = homepageHtml.match(/href="(\/posts\/[^"?#]+)"/)?.[1] ?? null;

    test.skip(!postPath, "No public post links were available to verify the bookmark sign-in gate.");

    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    try {
      await page.goto(postPath!);

      const signInToSaveLink = page.getByRole("link", { name: "Sign in to save this post" });
      await expect(signInToSaveLink).toBeVisible({ timeout: 15_000 });
      await expect(signInToSaveLink).toHaveAttribute("href", `/login?redirectTo=${encodeURIComponent(postPath!)}`);
      await expect(page.getByRole("button", { name: "Save this post" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Remove bookmark from this post" })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
