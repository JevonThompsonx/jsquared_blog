import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/resend", () => ({
  addResendContactToSegmentByEmail: vi.fn(),
  createResendContact: vi.fn(),
  getResendApiKey: vi.fn(),
  getResendConfig: vi.fn(),
  getResendContactByEmail: vi.fn(),
  listResendContactSegmentsByEmail: vi.fn(),
  sendResendEmail: vi.fn(),
  updateResendContactByEmail: vi.fn(),
}));

import {
  addResendContactToSegmentByEmail,
  createResendContact,
  getResendApiKey,
  getResendConfig,
  getResendContactByEmail,
  listResendContactSegmentsByEmail,
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

  it("returns already-subscribed when the contact is active and already in the segment", async () => {
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
    vi.mocked(listResendContactSegmentsByEmail).mockResolvedValue([
      { id: "segment-123", name: "Newsletter", createdAt: "2026-03-20T12:00:00.000Z" },
    ]);

    const result = await subscribeToNewsletter({ email: "reader@example.com" });

    expect(result).toEqual({ status: "already-subscribed" });
    expect(vi.mocked(updateResendContactByEmail)).not.toHaveBeenCalled();
    expect(vi.mocked(addResendContactToSegmentByEmail)).not.toHaveBeenCalled();
  });

  it("adds the newsletter segment for active contacts that are not yet subscribed to it", async () => {
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
    vi.mocked(listResendContactSegmentsByEmail).mockResolvedValue([]);
    vi.mocked(addResendContactToSegmentByEmail).mockResolvedValue({ id: "segment-123" });

    const result = await subscribeToNewsletter({ email: "reader@example.com" });

    expect(result).toEqual({ status: "subscribed", source: "updated" });
    expect(vi.mocked(addResendContactToSegmentByEmail)).toHaveBeenCalledWith("reader@example.com", "segment-123");
    expect(vi.mocked(updateResendContactByEmail)).not.toHaveBeenCalled();
  });

  it("reactivates unsubscribed contacts and adds the segment when needed", async () => {
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
    vi.mocked(listResendContactSegmentsByEmail).mockResolvedValue([]);
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
});

describe("buildWelcomeEmail", () => {
  it("includes the first name in the greeting when provided", () => {
    const email = buildWelcomeEmail({ email: "a@b.com", firstName: "Jevon" });
    expect(email.subject).toBe("Welcome to J² Adventures!");
    expect(email.html).toContain("Jevon");
    expect(email.text).toContain("Jevon");
  });

  it("uses 'adventurer' as fallback when no firstName is given", () => {
    const email = buildWelcomeEmail({ email: "a@b.com" });
    expect(email.html).toContain("adventurer");
    expect(email.text).toContain("adventurer");
  });

  it("escapes HTML in the firstName to prevent XSS", () => {
    const email = buildWelcomeEmail({ email: "a@b.com", firstName: "<script>alert('xss')</script>" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("always has a subject line", () => {
    const email = buildWelcomeEmail({ email: "a@b.com" });
    expect(email.subject).toBeTruthy();
  });

  it("returns both html and text versions", () => {
    const email = buildWelcomeEmail({ email: "a@b.com", firstName: "Test" });
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
      subject: "Welcome to J² Adventures!",
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
