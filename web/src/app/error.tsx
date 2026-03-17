"use client";

import Link from "next/link";
import { useEffect } from "react";

import { FeedbackPanel } from "@/components/ui/feedback-panel";
import { captureException } from "@/lib/sentry";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center px-4 py-14 text-[var(--foreground)] sm:px-6 sm:py-16">
      <FeedbackPanel
        actions={(
          <>
            <button className="rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white" onClick={reset} type="button">
              Try again
            </button>
            <Link className="rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]" href="/">
              Return home
            </Link>
          </>
        )}
        description="That page hit a snag. Try again, head back to the homepage, or return to the editor if you were in the middle of publishing."
        eyebrow="Trail interrupted"
        title="Something went sideways."
        tone="error"
      />
    </div>
  );
}
