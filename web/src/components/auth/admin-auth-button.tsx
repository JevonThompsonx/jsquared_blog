type SignedInAs = "admin" | "non-admin" | null;

type AdminAuthButtonProps = {
  signedInAs: SignedInAs;
};

export function AdminAuthButton({ signedInAs }: AdminAuthButtonProps) {
  if (signedInAs === "admin") {
    return (
      <a
        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
        href="/api/auth/logout?returnTo=%2Fadmin"
      >
        Sign out
      </a>
    );
  }

  if (signedInAs === "non-admin") {
    return (
      <a
        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
        href="/api/auth/logout?returnTo=%2Fadmin"
      >
        Sign out and switch account
      </a>
    );
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <a
        className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white"
        href="/api/auth/login?returnTo=%2Fadmin"
      >
        Sign in with WorkOS
      </a>
      <span className="text-xs text-[var(--muted)]">
        Email one-time code · expires in 10 minutes
      </span>
    </span>
  );
}
