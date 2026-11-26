import Link from "next/link";

import { FeedbackPanel } from "@/components/ui/feedback-panel";

export default function NotFound() {
  return (
    <main
      className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20"
      id="main-content"
      tabIndex={-1}
    >
      <FeedbackPanel
        actions={
          <>
            <Link
              className="inline-flex w-fit rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              href="/"
            >
              Return home
            </Link>
            <Link
              className="inline-flex w-fit rounded-full border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              href="/series"
            >
              Browse series
            </Link>
          </>
        }
        description="Try heading back to the homepage, or pick up another story from the trail."
        eyebrow="Trail marker missing"
        headingLevel="h1"
        title="That page could not be found."
      />
    </main>
  );
}
