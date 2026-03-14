"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center px-6 py-16 text-[var(--foreground)]">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Trail interrupted</p>
      <h1 className="text-4xl font-semibold">Something went sideways.</h1>
      <p className="mt-4 max-w-2xl text-base text-[var(--muted)]">
        The new Next.js surface is in migration. Try the page again or continue using the existing app while this route is being rebuilt.
      </p>
      <button
        className="mt-8 rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white"
        onClick={reset}
        type="button"
      >
        Try again
      </button>
    </div>
  );
}
