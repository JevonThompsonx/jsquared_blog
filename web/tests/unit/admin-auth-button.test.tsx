import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminAuthButton } from "@/components/auth/admin-auth-button";

describe("AdminAuthButton", () => {
  it("offers one sign-out action to an admin", () => {
    const markup = renderToStaticMarkup(<AdminAuthButton signedInAs="admin" />);

    expect(markup).toContain(">Sign out</a>");
    expect(markup).toContain('href="/api/auth/logout?returnTo=%2Fadmin"');
    expect(markup).not.toContain("switch account");
    expect(markup).not.toContain("Sign in with WorkOS");
  });

  it("offers one combined sign-out and switch-account action to a non-admin", () => {
    const markup = renderToStaticMarkup(
      <AdminAuthButton signedInAs="non-admin" />,
    );

    expect(markup).toContain("Sign out and switch account");
    expect(markup).toContain('href="/api/auth/logout?returnTo=%2Fadmin"');
    expect(markup).not.toContain(">Sign out</a>");
    expect(markup).not.toContain("Sign in with WorkOS");
    expect(markup.match(/\/api\/auth\/logout/g)).toHaveLength(1);
  });

  it("offers anonymous sign-in with a one-time-code hint", () => {
    const markup = renderToStaticMarkup(<AdminAuthButton signedInAs={null} />);

    expect(markup).toContain("Sign in with WorkOS");
    expect(markup).toContain("one-time code");
    expect(markup).toContain("10 minutes");
    expect(markup).toContain('href="/api/auth/login?returnTo=%2Fadmin"');
    expect(markup).not.toContain("/api/auth/logout");
  });
});
