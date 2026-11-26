import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/layout/site-header";
import { SITE_URL } from "@/lib/utils";

const CONTACT_EMAIL = "blog@jsquaredadventures.com";
const EFFECTIVE_DATE = "November 24, 2026";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What J²Adventures collects, which cookies and third parties are involved, how long data is kept, and how to request access or deletion.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
};

const cookies: ReadonlyArray<{
  name: string;
  purpose: string;
  lifetime: string;
  essential: string;
}> = [
  {
    name: "j2_theme",
    purpose: "Remembers your light/dark theme preference.",
    lifetime: "1 year",
    essential: "Preference",
  },
  {
    name: "j2-viewer-id",
    purpose:
      "Random, pseudonymous identifier used to avoid counting the same reader twice in a post's view count.",
    lifetime: "8 hours",
    essential: "Anonymous analytics",
  },
  {
    name: "j2-viewed-post-*",
    purpose:
      "Marks that this browser has already counted a view for a specific post.",
    lifetime: "8 hours",
    essential: "Anonymous analytics",
  },
  {
    name: "CF_AppSession",
    purpose:
      "Cloudflare Access session. Only set after an allowlisted admin signs in to /admin; public readers never receive it.",
    lifetime: "24 hours",
    essential: "Admin sign-in",
  },
  {
    name: "wos-session",
    purpose:
      "WorkOS AuthKit reader and admin session. HttpOnly, SameSite=Lax, Secure in production, and scoped to this host; it is not readable by JavaScript.",
    lifetime: "14 days",
    essential: "Reader and admin sign-in",
  },
  {
    name: "wos-auth-verifier*",
    purpose:
      "Short-lived PKCE verifier used only while completing an AuthKit sign-in. Deleted after the callback.",
    lifetime: "10 minutes",
    essential: "Sign-in security",
  },
  {
    name: "j2-auth-return",
    purpose:
      "Remembers a validated same-origin path while WorkOS completes sign-out, then is deleted by the proxy.",
    lifetime: "5 minutes",
    essential: "Sign-out return path",
  },
  {
    name: "j2-admin-flash",
    purpose: "One-time admin status message after a post action.",
    lifetime: "60 seconds",
    essential: "Admin UX",
  },
];

const thirdParties: ReadonlyArray<{ name: string; role: string }> = [
  {
    name: "Cloudflare",
    role: "TLS, DNS, Tunnel, bot/WAF protection, and the Access gate on /admin.",
  },
  {
    name: "Self-hosted database (our server)",
    role: "SQLite database for posts, comments, bookmarks, profiles, and view counts. It runs on infrastructure we control and is not shared with a third party.",
  },
  {
    name: "WorkOS AuthKit",
    role: "Hosted reader and admin authentication, email verification, password management, and session issuance.",
  },
  {
    name: "Self-hosted accounts (our server)",
    role: "Local user IDs, roles, profiles, comments, and bookmarks. WorkOS identities are linked to these rows by verified email; passwords are not stored by this site.",
  },
  {
    name: "Self-hosted media (our server)",
    role: "Uploaded images are re-encoded, stripped of location metadata, and served from our own domain.",
  },
  {
    name: "Resend",
    role: "Transactional email for comment notifications and newsletter relay. Account verification and password resets are sent by WorkOS AuthKit.",
  },
  {
    name: "Listmonk (self-hosted)",
    role: "Newsletter subscription state, double opt-in confirmation, campaigns, and unsubscribe handling on our own server.",
  },
  {
    name: "Self-hosted rate limiting",
    role: "Short-lived, hashed request identifiers kept in the application process — not raw IP addresses, and not sent to a third party.",
  },
  {
    name: "Sentry",
    role: "Error monitoring. Configured with sendDefaultPii=false; replays mask all text, inputs, and media.",
  },
  {
    name: "Plausible Analytics",
    role: "Cookieless, aggregate page analytics loaded from plausible.io. It does not set cookies or build a cross-site profile.",
  },
  {
    name: "Stadia Maps and OpenStreetMap",
    role: "Map tiles and place search. These services receive the map viewport and your IP address when you open a map.",
  },
  {
    name: "Spotify",
    role: "Only on posts with a song block. The embed loads from open.spotify.com and may set Spotify's own cookies.",
  },
];

export default function PrivacyPage() {
  return (
    <main
      className="min-h-screen pb-20 pt-20 sm:pt-24"
      id="main-content"
      style={{ background: "var(--background)" }}
      tabIndex={-1}
    >
      <SiteHeader />

      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <header className="mt-10 border-b border-[var(--border)] pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            Privacy
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            What we collect, and what we do not.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--text-secondary)]">
            J²Adventures is a personal travel blog. We do not run ads, sell
            data, or build advertising profiles. This page explains the limited
            data that keeps the site working, the services involved, and how to
            ask us to delete something.
          </p>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Effective {EFFECTIVE_DATE}
          </p>
        </header>

        <div className="prose-content mt-10 space-y-10 text-[var(--text-secondary)]">
          <section aria-labelledby="analytics">
            <h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              id="analytics"
            >
              Analytics
            </h2>
            <p className="mt-3">
              We use <strong>Plausible Analytics</strong> to understand which
              stories people read. It is cookieless, does not fingerprint your
              device, and does not track you across other websites. The script
              loads directly from <code>plausible.io</code>, and the aggregate
              numbers live in Plausible&apos;s dashboard. We do not use Google
              Analytics, advertising pixels, or retargeting tags.
            </p>
          </section>

          <section aria-labelledby="cookies">
            <h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              id="cookies"
            >
              Cookies we set
            </h2>
            <p className="mt-3">
              We keep cookies to the minimum needed for preferences, anonymous
              view deduplication, and admin sign-in. There is no advertising or
              cross-site tracking cookie, so there is no consent banner to
              click.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-2 pr-4 font-semibold text-[var(--text-primary)]">
                      Name
                    </th>
                    <th className="py-2 pr-4 font-semibold text-[var(--text-primary)]">
                      Purpose
                    </th>
                    <th className="py-2 pr-4 font-semibold text-[var(--text-primary)]">
                      Lifetime
                    </th>
                    <th className="py-2 font-semibold text-[var(--text-primary)]">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cookies.map((cookie) => (
                    <tr
                      className="border-b border-[var(--border)]/60"
                      key={cookie.name}
                    >
                      <td className="py-3 pr-4 font-mono text-xs">
                        {cookie.name}
                      </td>
                      <td className="py-3 pr-4">{cookie.purpose}</td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {cookie.lifetime}
                      </td>
                      <td className="py-3">{cookie.essential}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm">
              Reader sign-in uses an HttpOnly session cookie set by our own
              server. JavaScript cannot read it; clearing cookies signs you out.
              The view tracker also writes a
              <code> j2-viewed-post:&lt;id&gt; </code> marker to sessionStorage
              for the current tab so a single read is counted once.
            </p>
          </section>

          <section aria-labelledby="accounts">
            <h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              id="accounts"
            >
              Accounts, comments, and bookmarks
            </h2>
            <p className="mt-3">
              You can read the entire blog without an account. If you choose to
              comment or bookmark, our server creates an account with your email
              address. Your display name, optional avatar, comments, and
              bookmarks are stored in our database. Your email is not shown
              publicly. Comment notifications are sent to the site owners, not
              to other readers.
            </p>
            <p className="mt-3">
              Comments remain until you delete them or ask us to. Deleting an
              account removes your profile, comments, bookmarks, and likes from
              the public site; backup copies may persist for a short operational
              window.
            </p>
          </section>

          <section aria-labelledby="newsletter">
            <h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              id="newsletter"
            >
              Newsletter
            </h2>
            <p className="mt-3">
              If you subscribe, we store your email address and, if you provide
              it, your first name in a self-hosted Listmonk instance on our own
              server. Signup is <strong>double opt-in</strong>: you receive a
              confirmation email and are only added to the active list after you
              click the link. Unconfirmed addresses are kept only to complete
              that confirmation and are not sent campaigns; they are pruned or
              removed by an admin. Every message includes an unsubscribe link,
              and unsubscribing removes you from the audience. Resend is used
              only as the outbound delivery relay; it does not own the
              subscriber list. We do not sell or share the list.
            </p>
          </section>

          <section aria-labelledby="media">
            <h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              id="media"
            >
              Photos and location data
            </h2>
            <p className="mt-3">
              Post locations shown on the map are places we deliberately chose
              to publish. Camera metadata (camera body, lens, exposure, capture
              time) may be shown with gallery photos for context. Exact GPS
              coordinates from photo files are <strong>not published</strong>;
              they stay in the admin-only record. If a photo you appear in needs
              to be removed, email us and we will take it down.
            </p>
          </section>

          <section aria-labelledby="third-parties">
            <h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              id="third-parties"
            >
              Service providers
            </h2>
            <p className="mt-3">
              These providers process data on our behalf so the site can run.
              Each receives only what its role requires, and each has its own
              privacy policy.
            </p>
            <ul className="mt-4 space-y-3">
              {thirdParties.map((party) => (
                <li key={party.name}>
                  <strong className="text-[var(--text-primary)]">
                    {party.name}
                  </strong>{" "}
                  — {party.role}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="security">
            <h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              id="security"
            >
              Security and retention
            </h2>
            <p className="mt-3">
              Traffic is served over HTTPS with HSTS. Admin pages sit behind
              Cloudflare Access and are limited to the site owners. Rate-limit
              records store a hashed request identifier for a short window
              rather than a raw IP address. Error reports are configured not to
              include request bodies, headers, cookies, or session-replay text.
            </p>
            <p className="mt-3">
              We keep content and account data while the account or content
              exists, newsletter data until you unsubscribe, and short-lived
              operational logs for security and debugging. We do not keep
              advertising profiles because we do not create them.
            </p>
          </section>

          <section aria-labelledby="rights">
            <h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              id="rights"
            >
              Your choices
            </h2>
            <p className="mt-3">
              You can ask us to access, correct, export, or delete the personal
              data associated with your account. You can also delete individual
              comments from the post where you wrote them. Email{" "}
              <a
                className="font-semibold text-[var(--accent)] underline"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>{" "}
              with the address you used and what you want changed. We aim to
              respond within 30 days.
            </p>
            <p className="mt-3">
              Because we do not sell or share personal information for
              cross-context behavioral advertising, there is nothing to opt out
              of under &ldquo;Do Not Sell or Share.&rdquo; If you are in the EU
              or UK, our lawful basis for account and newsletter data is your
              consent or the performance of the service you asked for; for
              security logs it is our legitimate interest in keeping the site
              available.
            </p>
          </section>

          <section aria-labelledby="changes">
            <h2
              className="text-2xl font-bold text-[var(--text-primary)]"
              id="changes"
            >
              Changes and contact
            </h2>
            <p className="mt-3">
              If this policy changes materially, we will update the effective
              date on this page. Questions or requests can go to{" "}
              <a
                className="font-semibold text-[var(--accent)] underline"
                href={`mailto:${CONTACT_EMAIL}`}
              >
                {CONTACT_EMAIL}
              </a>
              . You can also read our{" "}
              <Link
                className="font-semibold text-[var(--accent)] underline"
                href="/accessibility"
              >
                accessibility commitment
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
