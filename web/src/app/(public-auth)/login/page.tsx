export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-sm text-center"><div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--primary)]" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
