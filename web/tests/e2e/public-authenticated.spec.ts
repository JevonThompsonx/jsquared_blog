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

function isCommentDeleteResponse(response: { request(): { method(): string }; url(): string; ok(): boolean }) {
  return response.request().method() === "DELETE"
    && /\/api\/comments\/[^/]+$/.test(new URL(response.url()).pathname);
}

function getRetryAfterDelayMs(retryAfterHeader: string | undefined): number {
  if (!retryAfterHeader) {
    return 1500;
  }

  const numericSeconds = Number(retryAfterHeader);
  if (Number.isFinite(numericSeconds) && numericSeconds >= 0) {
    return (numericSeconds * 1000) + 500;
  }

  const retryAfterDateMs = Date.parse(retryAfterHeader);
  if (Number.isFinite(retryAfterDateMs)) {
    return Math.max(retryAfterDateMs - Date.now(), 0) + 500;
  }

  return 1500;
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

  publicTest("signed-in user can update their display name and still see it after reload", async ({ page }) => {
    await page.goto("/account");

    await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();

    const displayNameField = page.getByLabel("Display name");
    const saveDisplayNameButton = page.getByRole("button", { name: "Save" }).first();
    await expect(displayNameField).toBeVisible();

    const originalDisplayName = (await displayNameField.inputValue()).trim();
    expect(originalDisplayName.length).toBeGreaterThan(0);

    const updatedDisplayName = `E2E Public ${Date.now()}`;

    try {
      await displayNameField.fill(updatedDisplayName);

      await Promise.all([
        page.waitForResponse((response) => {
          return response.request().method() === "PATCH"
            && new URL(response.url()).pathname === "/api/account/profile"
            && response.ok();
        }),
        saveDisplayNameButton.click(),
      ]);

      await expect(page.getByText("Display name updated.", { exact: true })).toBeVisible();
      await expect(displayNameField).toHaveValue(updatedDisplayName);

      await page.reload();
      await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();
      await expect(page.getByLabel("Display name")).toHaveValue(updatedDisplayName);
    } finally {
      await page.goto("/account");
      await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();

      const restoredDisplayNameField = page.getByLabel("Display name");
      if ((await restoredDisplayNameField.inputValue()).trim() !== originalDisplayName) {
        await restoredDisplayNameField.fill(originalDisplayName);

        await Promise.all([
          page.waitForResponse((response) => {
            return response.request().method() === "PATCH"
              && new URL(response.url()).pathname === "/api/account/profile"
              && response.ok();
          }),
          page.getByRole("button", { name: "Save" }).first().click(),
        ]);

        await expect(restoredDisplayNameField).toHaveValue(originalDisplayName);
      }
    }
  });

  publicTest("signed-in user can sign out from account settings and return to a logged-out home state", async ({ page }) => {
    await page.goto("/account");

    await expect(page.getByRole("heading", { name: "Account Settings" })).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "J²Adventures" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Account" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Saved" })).toHaveCount(0);
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

  publicTest("signed-in user can delete one of their own comments on the seeded fixture post", async ({ page }) => {
    publicTest.skip(!configuredPublicPostSlug, "Run bun run seed:e2e to provision the public E2E post slug.");
    publicTest.setTimeout(90_000);

    const commentContent = `E2E public delete target ${Date.now()}`;

    await page.goto(`/posts/${configuredPublicPostSlug}`);

    const commentsHeading = page.getByRole("heading", { name: /^Comments\b/i });
    await expect(commentsHeading).toBeVisible();

    const commentField = page.getByPlaceholder("Share your thoughts...");
    await expect(commentField).toBeVisible({ timeout: 15_000 });
    let createResponse: Awaited<ReturnType<typeof page.waitForResponse>> | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await commentField.fill(commentContent);

      const currentCreateResponse = await Promise.all([
        page.waitForResponse((response) => {
          return response.request().method() === "POST"
            && /\/api\/posts\/[^/]+\/comments$/.test(new URL(response.url()).pathname);
        }),
        page.getByRole("button", { name: "Post comment" }).click(),
      ]).then(([response]) => response);

      createResponse = currentCreateResponse;

      if (currentCreateResponse.ok()) {
        break;
      }

      expect(currentCreateResponse.status()).toBe(429);
      expect(attempt).toBe(0);

      await page.waitForTimeout(getRetryAfterDelayMs(currentCreateResponse.headers()["retry-after"]));
    }

    expect(createResponse).not.toBeNull();
    if (!createResponse) {
      throw new Error("Comment creation did not produce a response.");
    }

    expect(createResponse.ok()).toBe(true);

    const commentCard = page.getByText(commentContent, { exact: true }).first().locator("xpath=ancestor::article[1]");
    await expect(commentCard).toBeVisible();

    await commentCard.getByRole("button", { name: "Delete" }).click();
    const deleteConfirmation = commentCard.getByText("Delete comment?", { exact: true }).locator("xpath=ancestor::div[1]");
    await expect(deleteConfirmation).toBeVisible();
    const confirmDeleteButton = deleteConfirmation.getByRole("button", { name: "Delete" });

    const [deleteRequest, deleteResponse] = await Promise.all([
      page.waitForRequest((request) => {
        return request.method() === "DELETE"
          && /\/api\/comments\/[^/]+$/.test(new URL(request.url()).pathname);
      }),
      page.waitForResponse(isCommentDeleteResponse),
      confirmDeleteButton.click(),
    ]);

    expect(deleteResponse.url()).toBe(deleteRequest.url());
    expect(deleteResponse.ok()).toBe(true);

    await expect(page.getByText(commentContent, { exact: true })).toHaveCount(0);
  });
});
