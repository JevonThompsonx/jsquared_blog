export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccountSettings } from "./account-settings";

export const metadata: Metadata = {
  title: "Account Settings",
};

/** Shared shell shown while the client component loads or redirects to sign-in. */
export function AccountPageFallback() {
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        Account Settings
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Sign in to manage your profile, email, password, and theme preference.
      </p>
      <Link
        className="mt-4 inline-flex rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--on-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)]"
        href={{ pathname: "/login", query: { redirectTo: "/account" } }}
      >
        Sign in
      </Link>
      <div aria-hidden="true" className="mt-6 flex justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--primary)]" />
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<AccountPageFallback />}>
      <AccountSettings />
    </Suspense>
  );
}
