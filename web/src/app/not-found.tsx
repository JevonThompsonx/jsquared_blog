import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">Trail marker missing</p>
      <h1 className="mt-4 text-4xl font-semibold text-[var(--foreground)]">That route does not exist yet.</h1>
      <p className="mt-4 text-lg text-[var(--muted)]">
        The Next.js migration is underway. Head back to the homepage and keep exploring.
      </p>
      <Link
        className="mt-8 inline-flex w-fit rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white"
        href="/"
      >
        Return home
      </Link>
    </div>
  );
}
