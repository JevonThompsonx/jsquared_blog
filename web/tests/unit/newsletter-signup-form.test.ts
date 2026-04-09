import { describe, expect, it, vi } from "vitest";

import { getNewsletterResponseState, getNewsletterSubmissionState } from "@/components/blog/newsletter-signup-form";

describe("newsletter signup form response handling", () => {
  it("treats bare 202 responses as unavailable without requiring a JSON body", () => {
    expect(getNewsletterResponseState(202, {})).toEqual({
      status: "error",
      message: "Newsletter signup is not available right now.",
    });
  });

  it("fails closed when a 2xx response omits an explicit status", () => {
    expect(getNewsletterResponseState(200, {})).toEqual({
      status: "error",
        message: "Something went wrong. Please try again.",
    });
  });

  it("does not report skipped responses as a successful subscription", () => {
    expect(
      getNewsletterResponseState(202, {
        status: "skipped",
        reason: "missing-config",
      }),
    ).toEqual({
      status: "error",
      message: "Newsletter signup is not available right now.",
    });
  });

  it("keeps already-subscribed responses distinct from new subscriptions", () => {
    expect(getNewsletterResponseState(200, { status: "already-subscribed" })).toEqual({
      status: "success",
      message: "You're already on the list!",
    });

    expect(
      getNewsletterResponseState(201, {
        status: "subscribed",
        source: "created",
      }),
    ).toEqual({
      status: "success",
      message: "You're subscribed!",
    });
  });

  it("fails closed when the 2xx status code does not match the newsletter result shape", () => {
    expect(getNewsletterResponseState(200, { status: "subscribed", source: "created" })).toEqual({
      status: "error",
      message: "Something went wrong. Please try again.",
    });

    expect(getNewsletterResponseState(201, { status: "already-subscribed" })).toEqual({
      status: "error",
      message: "Something went wrong. Please try again.",
    });
  });

  it("does not parse JSON for a 202 response", async () => {
    const jsonMock = vi.fn().mockRejectedValue(new Error("no body"));

    await expect(getNewsletterSubmissionState({
      status: 202,
      ok: true,
      json: jsonMock,
    })).resolves.toEqual({
      status: "error",
      message: "Newsletter signup is not available right now.",
    });

    expect(jsonMock).not.toHaveBeenCalled();
  });

  it("does not parse JSON for a 400 response", async () => {
    const jsonMock = vi.fn().mockRejectedValue(new Error("no body"));

    await expect(getNewsletterSubmissionState({
      status: 400,
      ok: false,
      json: jsonMock,
    })).resolves.toEqual({
      status: "error",
      message: "Please enter a valid email address.",
    });

    expect(jsonMock).not.toHaveBeenCalled();
  });
});
