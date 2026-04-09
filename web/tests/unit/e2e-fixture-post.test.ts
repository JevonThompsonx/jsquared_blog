import { describe, expect, it } from "vitest";

import {
  E2E_FIXTURE_POST_EXCERPT,
  E2E_FIXTURE_POST_ID,
  E2E_FIXTURE_POST_SLUG,
  E2E_FIXTURE_POST_TITLE,
} from "@/lib/e2e/fixture-post";

describe("shared E2E fixture post metadata", () => {
  it("exposes the shared fixture identifiers used by admin and public flows", () => {
    expect(E2E_FIXTURE_POST_ID).toBe("e2e-admin-post-fixture");
    expect(E2E_FIXTURE_POST_SLUG).toBe("e2e-shared-fixture-post");
    expect(E2E_FIXTURE_POST_TITLE).toBe("E2E Shared Fixture Post");
    expect(E2E_FIXTURE_POST_EXCERPT).toBe("Stable fixture post used by Playwright admin and public smoke tests.");
  });

  it("keeps the shared fixture slug aligned with authenticated public flow expectations", () => {
    expect(E2E_FIXTURE_POST_SLUG).not.toBe("e2e-admin-fixture-post");
  });
});
