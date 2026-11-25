import Link from "next/link";

import { safeRedirectPath } from "@/lib/auth/redirect";

type AuthKitNoticeProps = {
  screen: "sign-in" | "sign-up" | "password";
  returnTo?: string;
};

export function AuthKitNotice({ screen, returnTo }: AuthKitNoticeProps) {
  const safeReturnTo = safeRedirectPath(returnTo ?? null);
  const returnQuery =
    safeReturnTo === "/" ? "" : `?returnTo=${encodeURIComponent(safeReturnTo)}`;

  if (screen === "password") {
    return (
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-xl sm:p-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Password and email sign-in
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Passwords, verification, and account recovery are handled securely
            by WorkOS AuthKit. Continue to the hosted sign-in page to manage
            your account.
          </p>
          <a
            className="mt-6 flex w-full items-center justify-center rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)]"
            href="/api/auth/login"
          >
            Continue to sign in
          </a>
          <Link
            className="mt-5 block text-center text-sm font-semibold text-[var(--accent)]"
            href="/"
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
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {isSignUp ? "Create an account" : "Sign in"}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {isSignUp
            ? "Create an account to comment, save stories, and keep your place. Sign-up is completed on our secure AuthKit page."
            : "Welcome back. Continue to our secure AuthKit page to sign in and join the conversation."}
        </p>
        <a
          className={`mt-6 flex w-full items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] ${
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
