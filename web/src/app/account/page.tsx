export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";

import { AccountSettings } from "./account-settings";

export const metadata: Metadata = {
  title: "Account Settings",
};

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--primary)]" /></div>}>
      <AccountSettings />
    </Suspense>
  );
}
