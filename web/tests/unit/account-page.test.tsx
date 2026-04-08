import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/account/account-settings", () => ({
  AccountSettings: () => createElement("div", { "data-testid": "account-settings" }, "Account settings shell"),
}));

import AccountPage, { dynamic, metadata } from "@/app/account/page";

describe("AccountPage", () => {
  it("keeps the route dynamic and exposes account settings metadata", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.title).toBe("Account Settings");
  });

  it("renders the account settings shell", () => {
    const markup = renderToStaticMarkup(AccountPage());

    expect(markup).toContain('data-testid="account-settings"');
    expect(markup).toContain("Account settings shell");
  });
});
