import type { ReactNode } from "react";

export function FeedbackPanel({
  eyebrow,
  title,
  description,
  actions,
  tone = "default",
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  tone?: "default" | "error";
}) {
  const toneClasses = tone === "error"
    ? "border-[var(--color-error-soft-border)] bg-[var(--color-error-soft-bg)]"
    : "border-[var(--border)] bg-[var(--card-bg)]";

  const descriptionClass = tone === "error"
    ? "mt-4 text-sm leading-7 text-[var(--color-error-text)] sm:text-base"
    : "mt-4 text-sm leading-7 text-[var(--text-secondary)] sm:text-base";
  const eyebrowClass = tone === "error"
    ? "text-[var(--color-error-text)]"
    : "text-[var(--text-secondary)]";

  return (
    <div className={`rounded-2xl border p-5 shadow-lg sm:p-6 ${toneClasses}`}>
      <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${eyebrowClass}`}>{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)] sm:text-3xl">{title}</h2>
      <p className={descriptionClass}>{description}</p>
      {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
