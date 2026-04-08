import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(public-auth)/callback/callback-content", () => ({
  CallbackContent: () => createElement("div", { "data-testid": "callback-content" }, "Callback content shell"),
}));

import CallbackPage, { dynamic } from "@/app/(public-auth)/callback/page";

describe("CallbackPage", () => {
  it("keeps the route dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders the callback content shell", () => {
    const markup = renderToStaticMarkup(CallbackPage());

    expect(markup).toContain('data-testid="callback-content"');
    expect(markup).toContain("Callback content shell");
  });
});
