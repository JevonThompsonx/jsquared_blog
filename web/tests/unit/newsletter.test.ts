import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/listmonk", () => ({
  isListmonkConfigured: vi.fn(),
  subscribeToListmonk: vi.fn(),
}));

import {
  isListmonkConfigured,
  subscribeToListmonk,
} from "@/lib/email/listmonk";
import {
  isNewsletterConfigured,
  subscribeToNewsletter,
} from "@/server/services/newsletter";

describe("newsletter service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips when Listmonk is not configured", async () => {
    vi.mocked(isListmonkConfigured).mockReturnValue(false);

    const result = await subscribeToNewsletter({ email: "reader@example.com" });

    expect(result).toEqual({ status: "skipped", reason: "missing-config" });
    expect(vi.mocked(subscribeToListmonk)).not.toHaveBeenCalled();
  });

  it("creates a pending Listmonk subscription with the display name", async () => {
    vi.mocked(isListmonkConfigured).mockReturnValue(true);
    vi.mocked(subscribeToListmonk).mockResolvedValue(undefined);

    const result = await subscribeToNewsletter({
      email: "reader@example.com",
      firstName: "Jevon",
      lastName: "Shaver",
      source: "footer-form",
    });

    expect(result).toEqual({ status: "subscribed" });
    expect(vi.mocked(subscribeToListmonk)).toHaveBeenCalledWith({
      email: "reader@example.com",
      name: "Jevon Shaver",
    });
  });

  it("omits an empty name", async () => {
    vi.mocked(isListmonkConfigured).mockReturnValue(true);
    vi.mocked(subscribeToListmonk).mockResolvedValue(undefined);

    await subscribeToNewsletter({ email: "reader@example.com" });

    expect(vi.mocked(subscribeToListmonk)).toHaveBeenCalledWith({
      email: "reader@example.com",
    });
  });

  it("propagates Listmonk failures", async () => {
    vi.mocked(isListmonkConfigured).mockReturnValue(true);
    vi.mocked(subscribeToListmonk).mockRejectedValue(
      new Error("Listmonk down"),
    );

    await expect(
      subscribeToNewsletter({ email: "reader@example.com" }),
    ).rejects.toThrow("Listmonk down");
  });

  it("reports configuration from the Listmonk client", () => {
    vi.mocked(isListmonkConfigured).mockReturnValue(true);
    expect(isNewsletterConfigured()).toBe(true);
  });
});
