import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ForgotPasswordPage, {
  metadata as forgotPasswordMetadata,
} from "@/app/(public-auth)/forgot-password/page";
import ResetPasswordPage, {
  metadata as resetPasswordMetadata,
} from "@/app/(public-auth)/reset-password/page";
import VerifyEmailPage, {
  metadata as verifyEmailMetadata,
} from "@/app/(public-auth)/verify-email/page";
import { AuthKitNotice } from "@/components/auth/authkit-notice";

const screenCases = [
  {
    screen: "sign-in" as const,
    heading: "Sign in",
    action: "/api/auth/login",
  },
  {
    screen: "sign-up" as const,
    heading: "Create an account",
    action: "/api/auth/signup",
  },
  {
    screen: "recovery" as const,
    heading: "Account access",
    action: "/api/auth/login",
  },
];

describe("AuthKitNotice", () => {
  it.each(screenCases)(
    "explains the $screen email one-time code flow without a local password form",
    ({ screen, heading, action }) => {
      const markup = renderToStaticMarkup(<AuthKitNotice screen={screen} />);

      expect(markup).toContain(heading);
      expect(markup).toContain("one-time email code");
      expect(markup).toContain("No password is required");
      expect(markup).toContain("Email codes expire after 10 minutes.");
      expect(markup).toContain(`href="${action}"`);
      expect(markup).not.toContain("<form");
      expect(markup).not.toContain('type="password"');
      expect(markup).not.toContain('name="password"');
    },
  );

  it.each(screenCases)(
    "preserves a safe return path on the $screen hosted AuthKit action",
    ({ screen, action }) => {
      const returnTo = "/bookmarks?view=all#saved";
      const markup = renderToStaticMarkup(
        <AuthKitNotice returnTo={returnTo} screen={screen} />,
      );

      expect(markup).toContain(
        `href="${action}?returnTo=${encodeURIComponent(returnTo)}"`,
      );
    },
  );

  it.each(screenCases)(
    "drops a hostile return path on the $screen hosted AuthKit action",
    ({ screen, action }) => {
      const markup = renderToStaticMarkup(
        <AuthKitNotice returnTo="//evil.example/path" screen={screen} />,
      );

      expect(markup).toContain(`href="${action}"`);
      expect(markup).not.toContain("evil.example");
    },
  );

  it("renders a fixed role=alert message for a known callback error", () => {
    const markup = renderToStaticMarkup(
      <AuthKitNotice error="identity_conflict" screen="sign-in" />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain(
      "This sign-in identity is already linked to another account. Contact support for help.",
    );
    expect(markup).not.toContain("identity_conflict");
  });

  it("does not reflect hostile callback error input", () => {
    const markup = renderToStaticMarkup(
      <AuthKitNotice
        error="<script>alert(1)</script>"
        returnTo="//evil.example"
        screen="sign-in"
      />,
    );

    expect(markup).not.toContain('role="alert"');
    expect(markup).not.toContain("<script>");
    expect(markup).not.toContain("evil.example");
  });
});

describe("recovery route metadata", () => {
  it.each([
    ["forgot-password", forgotPasswordMetadata],
    ["reset-password", resetPasswordMetadata],
    ["verify-email", verifyEmailMetadata],
  ])("describes email-code access on %s", (_route, metadata) => {
    expect(metadata.title).toMatch(/email/i);
    expect(metadata.description).toMatch(/one-time email code/i);
  });
});

describe("recovery route return paths", () => {
  it.each([
    ["forgot-password", ForgotPasswordPage],
    ["reset-password", ResetPasswordPage],
    ["verify-email", VerifyEmailPage],
  ])("preserves a safe return path on %s", async (_route, Page) => {
    const markup = renderToStaticMarkup(
      await Page({
        searchParams: Promise.resolve({ redirectTo: "/bookmarks" }),
      }),
    );

    expect(markup).toContain('href="/api/auth/login?returnTo=%2Fbookmarks"');
  });

  it.each([
    ["forgot-password", ForgotPasswordPage],
    ["reset-password", ResetPasswordPage],
    ["verify-email", VerifyEmailPage],
  ])("drops a hostile return path on %s", async (_route, Page) => {
    const markup = renderToStaticMarkup(
      await Page({
        searchParams: Promise.resolve({ returnTo: "https://evil.example" }),
      }),
    );

    expect(markup).toContain('href="/api/auth/login"');
    expect(markup).not.toContain("evil.example");
  });
});
