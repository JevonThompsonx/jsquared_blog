import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(public-auth)/login/login-form", () => ({
  LoginForm: () => createElement("div", { "data-testid": "login-form" }, "Login form shell"),
}));

import LoginPage, { dynamic } from "@/app/(public-auth)/login/page";

describe("LoginPage", () => {
  it("keeps the route dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders the login form shell", () => {
    const markup = renderToStaticMarkup(LoginPage());

    expect(markup).toContain('data-testid="login-form"');
    expect(markup).toContain("Login form shell");
  });
});
