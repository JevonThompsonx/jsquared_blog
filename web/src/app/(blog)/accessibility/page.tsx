import type { Metadata } from "next";

import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Accessibility — J²Adventures",
  description:
    "Our commitment to making J²Adventures usable for everyone — keyboard navigation, screen readers, color contrast, and how to report a barrier.",
};

const accessibilityFeatures: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Skip link",
    body:
      "A 'Skip to main content' link is the first focusable element on every page. It jumps keyboard users past the header and navigation straight to the article body.",
  },
  {
    title: "Semantic landmarks",
    body:
      "Every page exposes a labelled <main> landmark, labelled <nav> blocks, and a labelled <footer>, so screen reader users can orient and jump with a single keystroke.",
  },
  {
    title: "Keyboard navigation",
    body:
      "All interactive elements (links, buttons, form controls, dropdown menus, the mobile nav dialog) are reachable and operable with the keyboard alone. Visible focus rings are preserved on every theme.",
  },
  {
    title: "ARIA labels and roles",
    body:
      "Icon-only buttons, dialogs, and live regions carry descriptive aria-label, aria-live, and role attributes. Decorative SVGs are marked aria-hidden so they aren't announced.",
  },
  {
    title: "Color contrast",
    body:
      "Foreground text against cards and the page background targets WCAG AA contrast in both light and dark themes. The print stylesheet resets to a high-contrast black-on-white palette.",
  },
  {
    title: "Screen reader announcements",
    body:
      "Status changes (form submissions, share feedback, reading progress milestones) are announced via polite aria-live regions rather than announced silently.",
  },
  {
    title: "Respects reduced motion",
    body:
      "A prefers-reduced-motion media query disables non-essential animation and switches the back-to-top button from smooth scroll to instant jumps for users who opt out.",
  },
  {
    title: "Print-friendly articles",
    body:
      "Printing a story strips navigation, the reading-progress bar, share buttons, the comment thread, and the newsletter signup so you get a clean article on paper.",
  },
];

export default function AccessibilityPage() {
  return (
    <main
      className="min-h-screen pb-20 pt-20 sm:pt-24"
      id="main-content"
      style={{ background: "var(--background)" }}
      tabIndex={-1}
    >
      <SiteHeader />

      <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <header className="mt-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Accessibility</p>
          <h1 className="mt-1 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Built to be readable for everyone.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
            J²Adventures is a personal travel blog, but the people reading it come with all kinds of eyes,
            ears, hands, and browsers. We are committed to making the site usable for as many of you as
            possible, and to being honest about where it still falls short.
          </p>
        </header>

        <section aria-labelledby="commitment-heading" className="mt-10">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl" id="commitment-heading">
            Our commitment
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
            We target <strong>WCAG 2.2 Level AA</strong> for every public page. That means: meaningful
            structure, perceivable color contrast, keyboard operability, and clear feedback when
            something changes. We test with automated tooling, manual keyboard review, and screen
            reader spot-checks (VoiceOver and NVDA) before shipping changes that touch navigation or
            content rendering.
          </p>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
            Accessibility is not a one-time audit. It is a habit, baked into how we design new
            features, review pull requests, and respond to feedback from real users.
          </p>
        </section>

        <section aria-labelledby="features-heading" className="mt-10">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl" id="features-heading">
            What you can use today
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
            A non-exhaustive list of accessibility features already shipping on J²Adventures:
          </p>
          <ul className="mt-6 space-y-5">
            {accessibilityFeatures.map((feature) => (
              <li
                className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-sm"
                key={feature.title}
              >
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="limitations-heading" className="mt-10">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl" id="limitations-heading">
            Known limitations
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
            We are honest about what is not yet perfect:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-relaxed text-[var(--text-secondary)]">
            <li>
              Older posts may contain images uploaded without alt text. We are working backwards through
              the archive to fill these in. If a specific image is blocking you, please tell us.
            </li>
            <li>
              The interactive wishlist map depends on a third-party tile provider. If those tiles fail
              to load, the surrounding content remains accessible but the map itself will be blank.
            </li>
            <li>
              Caption tracks for any video embeds depend on the source platform (YouTube, etc.). We
              link to those videos rather than hosting them ourselves.
            </li>
          </ul>
        </section>

        <section aria-labelledby="contact-heading" className="mt-10">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl" id="contact-heading">
            Found a barrier? Tell us.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
            If something on J²Adventures is hard to use with your keyboard, screen reader, or any
            other assistive tech, we want to hear about it. Please include the page URL, what you were
            trying to do, and the browser or tool you were using. We respond to every accessibility
            report.
          </p>
          <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">
            Email:{" "}
            <a
              className="font-bold text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              href="mailto:accessibility@jsquaredadventures.com"
            >
              accessibility@jsquaredadventures.com
            </a>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            For everything else, head to the{" "}
            <a
              className="font-bold text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
              href="/about"
            >
              about page
            </a>{" "}
            for general contact details.
          </p>
        </section>

        <section aria-labelledby="standards-heading" className="mt-10">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl" id="standards-heading">
            Standards we follow
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
            We build against the W3C Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA, and
            use the WAI-ARIA Authoring Practices as a reference for custom widgets like the mobile
            navigation and dropdown filters. The site&apos;s content security policy and HTML
            semantics are reviewed in the same pull requests that change behaviour, so accessibility
            regressions get caught early.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            This statement was last reviewed on 2026-06-15.
          </p>
        </section>
      </div>
    </main>
  );
}
