import Link from "next/link";

import { FeedbackPanel } from "@/components/ui/feedback-panel";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
      <FeedbackPanel
        actions={(
          <>
            <Link className="inline-flex w-fit rounded-full bg-[var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white" href="/">
              Return home
            </Link>
          </>
        )}
        description="Try heading back to the homepage, opening the admin dashboard, or picking up another story from the trail."
        eyebrow="Trail marker missing"
        title="That page could not be found."
      />
    </div>
  );
}
