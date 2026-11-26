import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SignupPage, { dynamic } from "@/app/(public-auth)/signup/page";

describe("SignupPage", () => {
  it("keeps the route dynamic", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders a hosted sign-up notice without local credential fields", async () => {
    const markup = renderToStaticMarkup(await SignupPage({}));

    expect(markup).toContain("Create an account");
    expect(markup).toContain('href="/api/auth/signup"');
    expect(markup).not.toContain('type="password"');
    expect(markup).not.toContain("/api/public-auth");
  });

  it("preserves a safe return path on the hosted sign-up link", async () => {
    const markup = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({ redirectTo: "/bookmarks" }),
      }),
    );

    expect(markup).toContain('href="/api/auth/signup?returnTo=%2Fbookmarks"');
    expect(markup).toContain('href="/login?returnTo=%2Fbookmarks"');
  });

  it("drops repeated return-path parameters instead of trusting an array", async () => {
    const markup = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({
          redirectTo: ["/bookmarks", "/admin"],
        } as never),
      }),
    );

    expect(markup).toContain('href="/api/auth/signup"');
    expect(markup).not.toContain("bookmarks");
  });

  it("drops hostile return paths", async () => {
    const markup = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({ redirectTo: "https://evil.example" }),
      }),
    );

    expect(markup).toContain('href="/api/auth/signup"');
    expect(markup).not.toContain("evil.example");
  });
});
