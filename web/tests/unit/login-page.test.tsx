import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LoginPage, { dynamic } from "@/app/(public-auth)/login/page";

describe("LoginPage", () => {
  it("keeps the route dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders a hosted sign-in notice without a local password form", async () => {
    const markup = renderToStaticMarkup(await LoginPage({}));

    expect(markup).toContain("Sign in");
    expect(markup).toContain('href="/api/auth/login"');
    expect(markup).not.toContain('type="password"');
    expect(markup).not.toContain("/api/public-auth");
  });

  it("preserves a safe return path on the hosted sign-in link", async () => {
    const markup = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ redirectTo: "/bookmarks" }),
      }),
    );

    expect(markup).toContain('href="/api/auth/login?returnTo=%2Fbookmarks"');
    expect(markup).toContain('href="/signup?returnTo=%2Fbookmarks"');
  });

  it("drops repeated return-path parameters instead of trusting an array", async () => {
    const markup = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({
          redirectTo: ["/bookmarks", "/admin"],
        } as never),
      }),
    );

    expect(markup).toContain('href="/api/auth/login"');
    expect(markup).not.toContain("bookmarks");
  });

  it("drops hostile return paths", async () => {
    const markup = renderToStaticMarkup(
      await LoginPage({
        searchParams: Promise.resolve({ redirectTo: "//evil.example/path" }),
      }),
    );

    expect(markup).toContain('href="/api/auth/login"');
    expect(markup).not.toContain("evil.example");
  });
});
