"use client";

import { signIn, signOut } from "next-auth/react";

type AdminAuthButtonProps = {
  isSignedIn: boolean;
  disabled?: boolean;
};

export function AdminAuthButton({ isSignedIn, disabled = false }: AdminAuthButtonProps) {
  if (isSignedIn) {
    return (
      <button
        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
        onClick={() => signOut({ callbackUrl: "/admin" })}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white"
      disabled={disabled}
      onClick={() => signIn("github", { callbackUrl: "/admin" })}
      type="button"
    >
      {disabled ? "Configure auth first" : "Sign in with GitHub"}
    </button>
  );
}
