export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--primary)]" /></div>}>
      <SignupForm />
    </Suspense>
  );
}
