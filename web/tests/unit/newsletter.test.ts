import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/resend", () => ({
  addResendContactToSegmentByEmail: vi.fn(),
  createResendContact: vi.fn(),
  getResendApiKey: vi.fn(),
  getResendConfig: vi.fn(),
  getResendContactByEmail: vi.fn(),
  sendResendEmail: vi.fn(),
  updateResendContactByEmail: vi.fn(),
}));

import {
  addResendContactToSegmentByEmail,
  createResendContact,
  getResendApiKey,
  getResendConfig,
  getResendContactByEmail,
  sendResendEmail,
  updateResendContactByEmail,
} from "@/lib/email/resend";
import {
  buildWelcomeEmail,
  sendNewsletterWelcomeEmail,
  subscribeToNewsletter,
} from "@/server/services/newsletter";

describe("newsletter service", () => {
  const originalSegmentId = process.env.RESEND_NEWSLETTER_SEGMENT_ID;

  afterEach(() => {
    vi.clearAllMocks();

    if (originalSegmentId === undefined) {
      delete process.env.RESEND_NEWSLETTER_SEGMENT_ID;
    } else {
      process.env.RESEND_NEWSLETTER_SEGMENT_ID = originalSegmentId;
    }
  });

  it("skips when newsletter config is missing", async () => {
    delete process.env.RESEND_NEWSLETTER_SEGMENT_ID;
    vi.mocked(getResendApiKey).mockReturnValue(null);

    const result = await subscribeToNewsletter({ email: "reader@example.com" });

    expect(result).toEqual({ status: "skipped", reason: "missing-config" });
    expect(vi.mocked(createResendContact)).not.toHaveBeenCalled();
  });

  it("creates a new contact, adds to segment, and fires welcome email", async () => {
    process.env.RESEND_NEWSLETTER_SEGMENT_ID = "segment-123";
    vi.mocked(getResendApiKey).mockReturnValue("resend-key");
    vi.mocked(getResendContactByEmail).mockResolvedValue(null);
    vi.mocked(createResendContact).mockResolvedValue({ id: "contact-1" });
    vi.mocked(addResendContactToSegmentByEmail).mockResolvedValue({ id: "segment-123" });

    const result = await subscribeToNewsletter({
      email: "reader@example.com",
      firstName: "Jevon",
      source: "footer-form",
    });

    expect(result).toEqual({ status: "subscribed", source: "created" });
    expect(vi.mocked(createResendContact)).toHaveBeenCalledWith({
      email: "reader@example.com",
      firstName: "Jevon",
      lastName: undefined,
      unsubscribed: false,
    });
    expect(vi.mocked(addResendContactToSegmentByEmail)).toHaveBeenCalledWith("reader@example.com", "segment-123");
  });

  it("returns already-subscribed when add-to-segment throws for an active contact", async () => {
    process.env.RESEND_NEWSLETTER_SEGMENT_ID = "segment-123";
    vi.mocked(getResendApiKey).mockReturnValue("resend-key");
    vi.mocked(getResendContactByEmail).mockResolvedValue({
      id: "contact-1",
      email: "reader@example.com",
      unsubscribed: false,
      firstName: "Jevon",
      lastName: null,
      createdAt: "2026-03-20T12:00:00.000Z",
      properties: {},
    });
    vi.mocked(addResendContactToSegmentByEmail).mockRejectedValue(new Error("already in segment"));

    const result = await subscribeToNewsletter({ email: "reader@example.com" });

    expect(result).toEqual({ status: "already-subscribed" });
    expect(vi.mocked(updateResendContactByEmail)).not.toHaveBeenCalled();
  });

  it("adds segment for existing active contacts when add-to-segment succeeds", async () => {
    process.env.RESEND_NEWSLETTER_SEGMENT_ID = "segment-123";
    vi.mocked(getResendApiKey).mockReturnValue("resend-key");
    vi.mocked(getResendContactByEmail).mockResolvedValue({
      id: "contact-1",
      email: "reader@example.com",
      unsubscribed: false,
      firstName: "Jevon",
      lastName: null,
      createdAt: "2026-03-20T12:00:00.000Z",
      properties: {},
    });
    vi.mocked(addResendContactToSegmentByEmail).mockResolvedValue({ id: "segment-123" });

    const result = await subscribeToNewsletter({ email: "reader@example.com" });

    expect(result).toEqual({ status: "subscribed", source: "updated" });
    expect(vi.mocked(addResendContactToSegmentByEmail)).toHaveBeenCalledWith("reader@example.com", "segment-123");
    expect(vi.mocked(updateResendContactByEmail)).not.toHaveBeenCalled();
  });

  it("reactivates unsubscribed contacts and adds the segment", async () => {
    process.env.RESEND_NEWSLETTER_SEGMENT_ID = "segment-123";
    vi.mocked(getResendApiKey).mockReturnValue("resend-key");
    vi.mocked(getResendContactByEmail).mockResolvedValue({
      id: "contact-1",
      email: "reader@example.com",
      unsubscribed: true,
      firstName: null,
      lastName: null,
      createdAt: "2026-03-20T12:00:00.000Z",
      properties: { source: "old-form" },
    });
    vi.mocked(updateResendContactByEmail).mockResolvedValue({ id: "contact-1" });
    vi.mocked(addResendContactToSegmentByEmail).mockResolvedValue({ id: "segment-123" });

    const result = await subscribeToNewsletter({ email: "reader@example.com", source: "footer-form" });

    expect(result).toEqual({ status: "subscribed", source: "updated" });
    expect(vi.mocked(updateResendContactByEmail)).toHaveBeenCalledWith({
      email: "reader@example.com",
      unsubscribed: false,
      firstName: undefined,
      lastName: undefined,
    });
    expect(vi.mocked(addResendContactToSegmentByEmail)).toHaveBeenCalledWith("reader@example.com", "segment-123");
  });

  it("returns subscribed even when add-to-segment fails for reactivated contacts", async () => {
    process.env.RESEND_NEWSLETTER_SEGMENT_ID = "segment-123";
    vi.mocked(getResendApiKey).mockReturnValue("resend-key");
    vi.mocked(getResendContactByEmail).mockResolvedValue({
      id: "contact-1",
      email: "reader@example.com",
      unsubscribed: true,
      firstName: null,
      lastName: null,
      createdAt: "2026-03-20T12:00:00.000Z",
      properties: {},
    });
    vi.mocked(updateResendContactByEmail).mockResolvedValue({ id: "contact-1" });
    vi.mocked(addResendContactToSegmentByEmail).mockRejectedValue(new Error("already in segment"));

    const result = await subscribeToNewsletter({ email: "reader@example.com" });

    expect(result).toEqual({ status: "subscribed", source: "updated" });
    expect(vi.mocked(updateResendContactByEmail)).toHaveBeenCalled();
  });
});

describe("buildWelcomeEmail", () => {
  it("has a fixed heading in the subject line", () => {
    const email = buildWelcomeEmail({ email: "a@b.com" });
    expect(email.subject).toBe("Welcome to Jevon and Jessica's adventure blog");
  });

  it("has a fixed heading in the html and text versions", () => {
    const email = buildWelcomeEmail({ email: "a@b.com" });
    expect(email.html).toContain("Welcome to Jevon and Jessica's Adventure Blog!");
    expect(email.text).toContain("Welcome to Jevon and Jessica's Adventure Blog!");
  });

  it("returns both html and text versions", () => {
    const email = buildWelcomeEmail({ email: "a@b.com" });
    expect(email.html).toBeTruthy();
    expect(email.text).toBeTruthy();
    expect(email.html).not.toBe(email.text);
  });
});

describe("sendNewsletterWelcomeEmail", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips when resend config is missing", async () => {
    vi.mocked(getResendConfig).mockReturnValue(null);

    const result = await sendNewsletterWelcomeEmail({ email: "a@b.com" });

    expect(result).toBe("skipped");
    expect(vi.mocked(sendResendEmail)).not.toHaveBeenCalled();
  });

  it("sends welcome email when resend is configured", async () => {
    vi.mocked(getResendConfig).mockReturnValue({ apiKey: "key", fromEmail: "noreply@j2.com" });
    vi.mocked(sendResendEmail).mockResolvedValue("sent");

    const result = await sendNewsletterWelcomeEmail({ email: "a@b.com", firstName: "Jevon" });

    expect(result).toBe("sent");
    expect(vi.mocked(sendResendEmail)).toHaveBeenCalledWith({
      to: "a@b.com",
      subject: "Welcome to Jevon and Jessica's adventure blog",
      html: expect.stringContaining("Jevon"),
      text: expect.stringContaining("Jevon"),
    });
  });

  it("returns skipped when sendResendEmail throws", async () => {
    vi.mocked(getResendConfig).mockReturnValue({ apiKey: "key", fromEmail: "noreply@j2.com" });
    vi.mocked(sendResendEmail).mockRejectedValue(new Error("Resend API down"));

    const result = await sendNewsletterWelcomeEmail({ email: "a@b.com" });

    expect(result).toBe("skipped");
  });
});
