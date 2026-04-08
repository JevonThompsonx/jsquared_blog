import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(public-auth)/signup/signup-form", () => ({
  SignupForm: () => createElement("div", { "data-testid": "signup-form" }, "Signup form shell"),
}));

import SignupPage, { dynamic } from "@/app/(public-auth)/signup/page";

describe("SignupPage", () => {
  it("keeps the route dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders the signup form shell", () => {
    const markup = renderToStaticMarkup(SignupPage());

    expect(markup).toContain('data-testid="signup-form"');
    expect(markup).toContain("Signup form shell");
  });
});
