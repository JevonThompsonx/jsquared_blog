import { describe, expect, it } from "vitest";

import { getNewsletterResponseState } from "@/components/blog/newsletter-signup-form";

describe("newsletter signup form response handling", () => {
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
});
