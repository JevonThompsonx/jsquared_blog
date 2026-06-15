import Link from "next/link";

import { NewsletterSignupForm } from "@/components/blog/newsletter-signup-form";
import { SITE_URL } from "@/lib/utils";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

const navigationLinks: FooterLink[] = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/wishlist", label: "Wishlist" },
];

const contentLinks: FooterLink[] = [
  { href: "/tags", label: "Tags" },
  { href: "/categories", label: "Categories" },
  { href: "/series", label: "Series" },
  { href: "/feed.xml", label: "RSS Feed", external: true },
];

const socialLinks: FooterLink[] = [
  { href: "https://www.instagram.com/jsquaredadventures", label: "Instagram", external: true },
  { href: "https://www.youtube.com/@jsquaredadventures", label: "YouTube", external: true },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  if (link.external) {
    return (
      <a
        className="text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)] focus:outline-none focus-visible:underline"
        href={link.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link
      className="text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)] focus:outline-none focus-visible:underline"
      href={link.href}
    >
      {link.label}
    </Link>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      aria-label="Site footer"
      className="mt-16 border-t border-[var(--border)] bg-[var(--card-bg)]/60 backdrop-blur-sm"
    >
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">J²Adventures</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              Travel stories, maps, and photo-led field notes from the places we wander.
            </p>
            <a
              aria-label="Back to top"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] transition-colors hover:text-[var(--accent-strong)] focus:outline-none focus-visible:underline"
              href="#main-content"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              Back to top
            </a>
          </div>

          <nav aria-label="Footer navigation">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {navigationLinks.map((link) => (
                <li key={link.href}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer content">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Discover</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {contentLinks.map((link) => (
                <li key={link.href}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Stay on the trail</h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Get notified when we post new stories.
            </p>
            <div className="mt-3">
              <NewsletterSignupForm source="footer" />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-[var(--text-secondary)]">
            © {year} {SITE_URL.replace(/^https?:\/\//, "")}. All rights reserved.
          </p>
          {socialLinks.length > 0 ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Follow</span>
              {socialLinks.map((link) => (
                <FooterLinkItem key={link.href} link={link} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
