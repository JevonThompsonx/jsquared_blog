import { expect } from "@playwright/test";

import {
  configuredPublicEmail,
  configuredPublicPostSlug,
  getPublicStorageStateHint,
  hasPublicStorageState,
  publicTest,
} from "./helpers/public";

function isCommentCreateResponse(response: { request(): { method(): string }; url(): string; ok(): boolean }) {
  return response.request().method() === "POST"
    && /\/api\/posts\/[^/]+\/comments$/.test(new URL(response.url()).pathname)
    && response.ok();
}

publicTest.describe("authenticated public-user flows", () => {
  publicTest.skip(!hasPublicStorageState, getPublicStorageStateHint());

  publicTest("signed-in user can save a post and see it in bookmarks", async ({ page }) => {
    publicTest.skip(!configuredPublicPostSlug, "Run bun run seed:e2e to provision the public E2E post slug.");

    await page.goto(`/posts/${configuredPublicPostSlug}`);

    const saveBookmarkButton = page.getByRole("button", { name: "Save this post" });
    const removeBookmarkButton = page.getByRole("button", { name: "Remove bookmark from this post" });

    await expect(saveBookmarkButton.or(removeBookmarkButton)).toBeVisible({ timeout: 15_000 });

    if (await saveBookmarkButton.isVisible()) {
      await saveBookmarkButton.click();
    }

    await expect(removeBookmarkButton).toBeVisible();

    await page.goto("/bookmarks");

    await expect(page.getByRole("heading", { name: "Saved posts" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Read: E2E Admin Fixture Post/i })).toBeVisible();
  });

  publicTest("signed-in user can load account settings", async ({ page }) => {
    await page.goto("/account");

    await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByText(configuredPublicEmail, { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Display name")).toHaveValue(/\S+/);
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  publicTest("signed-in user can post a comment on the seeded fixture post", async ({ page }) => {
    publicTest.skip(!configuredPublicPostSlug, "Run bun run seed:e2e to provision the public E2E post slug.");

    const commentContent = `E2E public comment ${Date.now()}`;

    await page.goto(`/posts/${configuredPublicPostSlug}`);

    const commentsHeading = page.getByRole("heading", { name: /^Comments\b/i });
    await expect(commentsHeading).toBeVisible();

    const commentField = page.getByPlaceholder("Share your thoughts...");
    await expect(commentField).toBeVisible({ timeout: 15_000 });
    await commentField.fill(commentContent);

    await Promise.all([
      page.waitForResponse(isCommentCreateResponse),
      page.getByRole("button", { name: "Post comment" }).click(),
    ]);

    await expect(commentField).toHaveValue("");

    const commentsSection = page.locator("section").filter({ has: commentsHeading });
    await expect(commentsSection.getByText(commentContent, { exact: true })).toBeVisible();
  });

  publicTest("signed-in user can reply to a comment on the seeded fixture post", async ({ page }) => {
    publicTest.skip(!configuredPublicPostSlug, "Run bun run seed:e2e to provision the public E2E post slug.");

    const parentCommentContent = `E2E public parent comment ${Date.now()}`;
    const replyCommentContent = `E2E public reply ${Date.now()}`;

    await page.goto(`/posts/${configuredPublicPostSlug}`);

    const commentsHeading = page.getByRole("heading", { name: /^Comments\b/i });
    await expect(commentsHeading).toBeVisible();

    const commentField = page.getByPlaceholder("Share your thoughts...");
    await expect(commentField).toBeVisible({ timeout: 15_000 });
    await commentField.fill(parentCommentContent);

    await Promise.all([
      page.waitForResponse(isCommentCreateResponse),
      page.getByRole("button", { name: "Post comment" }).click(),
    ]);

    const parentCommentBody = page.getByText(parentCommentContent, { exact: true }).first();
    const parentComment = parentCommentBody.locator("xpath=ancestor::article[1]");
    const parentThread = parentComment.locator("xpath=..");
    await expect(parentComment).toBeVisible();

    await parentComment.getByRole("button", { name: "Reply" }).click();

    const replyField = parentComment.getByRole("textbox");
    await expect(replyField).toBeVisible();
    await replyField.fill(replyCommentContent);

    await Promise.all([
      page.waitForResponse(isCommentCreateResponse),
      page.getByRole("button", { name: "Post reply" }).click(),
    ]);

    await expect(replyField).not.toBeVisible();

    await expect(parentThread.getByText(replyCommentContent, { exact: true })).toBeVisible();
  });

  publicTest("signed-in user can like and unlike a freshly created comment on the seeded fixture post", async ({ page }) => {
    publicTest.skip(!configuredPublicPostSlug, "Run bun run seed:e2e to provision the public E2E post slug.");

    const commentContent = `E2E public like target ${Date.now()}`;

    await page.goto(`/posts/${configuredPublicPostSlug}`);

    const commentsHeading = page.getByRole("heading", { name: /^Comments\b/i });
    await expect(commentsHeading).toBeVisible();

    const commentField = page.getByPlaceholder("Share your thoughts...");
    await expect(commentField).toBeVisible({ timeout: 15_000 });
    await commentField.fill(commentContent);

    await Promise.all([
      page.waitForResponse(isCommentCreateResponse),
      page.getByRole("button", { name: "Post comment" }).click(),
    ]);

    const commentBody = page.getByText(commentContent, { exact: true }).first();
    const commentCard = commentBody.locator("xpath=ancestor::article[1]");
    await expect(commentCard).toBeVisible();

    const likeButton = commentCard.getByRole("button", { name: /^Like\s+0$/i });
    await expect(likeButton).toBeVisible();

    await Promise.all([
      page.waitForResponse((response) => {
        return response.request().method() === "POST"
          && /\/api\/comments\/[^/]+\/like$/.test(response.url())
          && response.ok();
      }),
      likeButton.click(),
    ]);

    await expect(commentCard.getByRole("button", { name: /^Liked\s+1$/i })).toBeVisible();

    await Promise.all([
      page.waitForResponse((response) => {
        return response.request().method() === "POST"
          && /\/api\/comments\/[^/]+\/like$/.test(response.url())
          && response.ok();
      }),
      commentCard.getByRole("button", { name: /^Liked\s+1$/i }).click(),
    ]);

    await expect(commentCard.getByRole("button", { name: /^Like\s+0$/i })).toBeVisible();
  });
});
