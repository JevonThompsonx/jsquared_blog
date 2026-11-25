type AdminAuthButtonProps = {
  isSignedIn: boolean;
};

export function AdminAuthButton({ isSignedIn }: AdminAuthButtonProps) {
  if (isSignedIn) {
    return (
      <a
        className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
        href="/api/auth/logout?returnTo=%2Fadmin"
      >
        Sign out
      </a>
    );
  }

  return (
    <a
      className="rounded-full bg-[var(--accent-strong)] px-4 py-2 text-sm font-semibold text-white"
      href="/api/auth/login?returnTo=%2Fadmin"
    >
      Sign in with WorkOS
    </a>
  );
}
