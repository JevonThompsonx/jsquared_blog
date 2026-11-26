import Link from "next/link";

import { safeRedirectPath } from "@/lib/auth/redirect";
import {
  getAuthErrorMessage,
  parseAuthErrorCode,
} from "@/lib/auth/auth-errors";

type AuthKitNoticeProps = {
  screen: "sign-in" | "sign-up" | "recovery";
  returnTo?: string;
  error?: string | null;
};

const buttonClassName =
  "mt-6 flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)]";

export function AuthKitNotice({ screen, returnTo, error }: AuthKitNoticeProps) {
  const safeReturnTo = safeRedirectPath(returnTo ?? null);
  const errorCode = parseAuthErrorCode(error);
  const errorMessage = errorCode ? getAuthErrorMessage(errorCode) : null;
  const returnQuery =
    safeReturnTo === "/" ? "" : `?returnTo=${encodeURIComponent(safeReturnTo)}`;
  const errorAlert = errorMessage ? (
    <div
      className="mb-5 rounded-xl border border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)] px-4 py-3 text-sm text-[var(--color-error-text)]"
      role="alert"
    >
      {errorMessage}
    </div>
  ) : null;

  if (screen === "recovery") {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
          {errorAlert}
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Account access
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Use a one-time email code from WorkOS AuthKit to sign in and recover
            access to your account. No password is required. Email codes expire
            after 10 minutes.
          </p>
          <a
            className={`${buttonClassName} bg-[var(--primary)] text-[var(--on-primary)]`}
            href={`/api/auth/login${returnQuery}`}
          >
            Continue with email code
          </a>
          <Link
            className="mt-5 block text-center text-sm font-semibold text-[var(--accent)]"
            href={safeReturnTo}
          >
            Back to the blog
          </Link>
        </div>
      </div>
    );
  }

  const isSignUp = screen === "sign-up";
  const action = isSignUp ? "/api/auth/signup" : "/api/auth/login";
  const alternatePath = isSignUp ? "/login" : "/signup";

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
        {errorAlert}
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {isSignUp ? "Create an account" : "Sign in"}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {isSignUp
            ? "Create an account to comment, save stories, and keep your place. WorkOS AuthKit sends a one-time email code to finish signing up. No password is required. Email codes expire after 10 minutes."
            : "Welcome back. Continue to WorkOS AuthKit to request a one-time email code, or use a configured passkey or social sign-in option. No password is required. Email codes expire after 10 minutes."}
        </p>
        <a
          className={`${buttonClassName} ${
            isSignUp
              ? "bg-[var(--primary)] text-[var(--on-primary)]"
              : "border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]"
          }`}
          href={`${action}${returnQuery}`}
        >
          {isSignUp ? "Continue to sign up" : "Continue to sign in"}
        </a>
        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <Link
            className="rounded-sm font-semibold text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            href={
              safeReturnTo === "/"
                ? alternatePath
                : `${alternatePath}?returnTo=${encodeURIComponent(safeReturnTo)}`
            }
          >
            {isSignUp ? "Sign in" : "Create one"}
          </Link>
        </p>
      </div>
    </div>
  );
}
