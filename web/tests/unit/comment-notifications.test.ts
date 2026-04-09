import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildCommentNotificationEmail,
  buildCommentNotificationPayload,
  sendCommentNotification,
} from "@/server/services/comment-notifications";
import type { CommentNotificationRecord } from "@/server/dal/comments";

function makeComment(overrides: Partial<CommentNotificationRecord> = {}): CommentNotificationRecord {
  return {
    id: "comment-1",
    content: "Loved this stop on the trip.",
    parentId: null,
    createdAt: new Date("2026-03-19T12:00:00.000Z"),
    authorDisplayName: "Jevon",
    post: {
      id: "post-1",
      title: "Patagonia Notes",
      slug: "patagonia-notes",
    },
    ...overrides,
  };
}

describe("comment notifications", () => {
  const originalResendApiKey = process.env.RESEND_API_KEY;
  const originalResendFromEmail = process.env.RESEND_FROM_EMAIL;
  const originalCommentNotificationToEmail = process.env.COMMENT_NOTIFICATION_TO_EMAIL;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalResendApiKey) {
      process.env.RESEND_API_KEY = originalResendApiKey;
    } else {
      delete process.env.RESEND_API_KEY;
    }

    if (originalResendFromEmail) {
      process.env.RESEND_FROM_EMAIL = originalResendFromEmail;
    } else {
      delete process.env.RESEND_FROM_EMAIL;
    }

    if (originalCommentNotificationToEmail) {
      process.env.COMMENT_NOTIFICATION_TO_EMAIL = originalCommentNotificationToEmail;
    } else {
      delete process.env.COMMENT_NOTIFICATION_TO_EMAIL;
    }

    globalThis.fetch = originalFetch;
  });

  it("builds notification payloads for top-level comments", () => {
    const payload = buildCommentNotificationPayload(makeComment());

    expect(payload).toEqual({
      commentId: "comment-1",
      postTitle: "Patagonia Notes",
      postUrl: "https://jsquaredadventures.com/posts/patagonia-notes",
      authorDisplayName: "Jevon",
      kind: "comment",
      content: "Loved this stop on the trip.",
      createdAtIso: "2026-03-19T12:00:00.000Z",
    });
  });

  it("builds reply emails with both html and text bodies", () => {
    const payload = buildCommentNotificationPayload(makeComment({ parentId: "parent-1" }));
    const email = buildCommentNotificationEmail(payload);

    expect(payload.kind).toBe("reply");
    expect(email.subject).toBe("New reply on Patagonia Notes");
    expect(email.html).toContain("<strong>Type:</strong> reply");
    expect(email.text).toContain("Type: reply");
    expect(email.text).toContain("https://jsquaredadventures.com/posts/patagonia-notes");
  });

  it("skips sending when resend config is missing", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.COMMENT_NOTIFICATION_TO_EMAIL;

    const result = await sendCommentNotification(makeComment());

    expect(result).toEqual({ status: "skipped", reason: "missing-config" });
  });

  it("skips sending when comment notification recipient is invalid", async () => {
    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.RESEND_FROM_EMAIL = "noreply@example.com";
    process.env.COMMENT_NOTIFICATION_TO_EMAIL = "not-an-email";
    globalThis.fetch = vi.fn();

    const result = await sendCommentNotification(makeComment());

    expect(result).toEqual({ status: "skipped", reason: "missing-config" });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("sends through resend when config is present", async () => {
    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.RESEND_FROM_EMAIL = "noreply@example.com";
    process.env.COMMENT_NOTIFICATION_TO_EMAIL = "owner@example.com";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));

    const result = await sendCommentNotification(makeComment({ parentId: "parent-1" }));

    expect(result).toEqual({ status: "sent" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer resend-test-key",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("returns a failed result when resend send throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    process.env.RESEND_API_KEY = "resend-test-key";
    process.env.RESEND_FROM_EMAIL = "noreply@example.com";
    process.env.COMMENT_NOTIFICATION_TO_EMAIL = "owner@example.com";
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("provider offline"));

    const result = await sendCommentNotification(makeComment());

    expect(result).toEqual({ status: "failed", reason: "send-error" });
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
  });
});
