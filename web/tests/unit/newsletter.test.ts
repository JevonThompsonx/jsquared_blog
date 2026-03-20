import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/resend", () => ({
  addResendContactToSegmentByEmail: vi.fn(),
  createResendContact: vi.fn(),
  getResendApiKey: vi.fn(),
  getResendContactByEmail: vi.fn(),
  listResendContactSegmentsByEmail: vi.fn(),
  updateResendContactByEmail: vi.fn(),
}));

import {
  addResendContactToSegmentByEmail,
  createResendContact,
  getResendApiKey,
  getResendContactByEmail,
  listResendContactSegmentsByEmail,
  updateResendContactByEmail,
} from "@/lib/email/resend";
import { subscribeToNewsletter } from "@/server/services/newsletter";

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

  it("creates a new contact and adds it to the configured segment", async () => {
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
      properties: { source: "footer-form" },
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
      properties: { source: "footer-form" },
    });
    expect(vi.mocked(addResendContactToSegmentByEmail)).toHaveBeenCalledWith("reader@example.com", "segment-123");
  });
});
