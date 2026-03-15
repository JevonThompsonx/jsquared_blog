"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { useNextTheme } from "@/components/theme/theme-provider";

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="currentColor" r="4" />
      <path d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23 5.46 5.46" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14.8 2.7a.75.75 0 0 0-.98.9 8.3 8.3 0 0 1 .43 2.64 8.57 8.57 0 0 1-8.56 8.56 8.3 8.3 0 0 1-2.64-.43.75.75 0 0 0-.9.98 10.5 10.5 0 1 0 12.65-12.65Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

export function SiteHeader() {
  const { mode, toggleMode } = useNextTheme();
  const { data: adminSession } = useSession();
  const isAdminSignedIn = Boolean(adminSession?.user?.id);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const [publicSession, setPublicSession] = useState<Session | null>(null);

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setPublicSession(data.session ?? null);
      }
    });

    const subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setPublicSession(nextSession);
    });

    return () => {
      active = false;
      subscription.data.subscription.unsubscribe();
    };
  }, [supabase]);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const isPublicSignedIn = Boolean(publicSession?.user);

  const ThemeToggle = () => (
    <button
      aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className="relative inline-flex h-10 w-[4.9rem] shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-1 shadow-sm transition-all duration-300 hover:border-[var(--primary)] focus:outline-none"
      onClick={toggleMode}
      title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      type="button"
    >
      <span className="flex w-full items-center justify-between px-1.5 text-[var(--text-secondary)] opacity-70">
        <SunIcon />
        <MoonIcon />
      </span>
      <span
        className={`absolute inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg transition-all duration-300 ${
          mode === "light" ? "translate-x-0" : "translate-x-[2.55rem]"
        }`}
      >
        {mode === "light" ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );

  return (
    <header className="navbar-landing">
      <div className="container mx-auto flex max-w-full items-center justify-between gap-4 p-4">
        <Link className="site-brand text-xl font-bold sm:text-2xl" href="/">
          J²Adventures
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          <nav>
            <Link className="nav-link-pill" href="/">
              Home
            </Link>
          </nav>

          <form action="/" className="relative">
            <input
              aria-label="Search stories"
              className="search-input w-40 rounded-full border py-2 pl-4 pr-9 text-sm transition-[width] duration-200 focus:w-52 lg:w-52 lg:focus:w-64"
              defaultValue=""
              name="search"
              placeholder="Search stories…"
              type="search"
            />
            <button
              aria-label="Search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] transition-colors hover:text-[var(--primary)]"
              type="submit"
            >
              <SearchIcon />
            </button>
          </form>

          <ThemeToggle />

          {isPublicSignedIn ? (
            <Link className="nav-link-pill text-sm" href="/account">
              Account
            </Link>
          ) : !isAdminSignedIn ? (
            <Link className="nav-link-pill text-sm" href={{ pathname: "/login", query: { redirectTo: pathname ?? "/" } }}>
              Sign in
            </Link>
          ) : null}

          {isAdminSignedIn ? (
            <Link className="hidden text-sm font-semibold text-[var(--accent)] xl:inline-flex hover:underline" href="/admin">
              {adminSession?.user?.githubLogin ?? adminSession?.user?.email ?? "Admin"}
            </Link>
          ) : null}
        </div>

        {/* Mobile: theme toggle + menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />

          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="nav-link-pill flex h-10 min-w-[2.6rem] items-center justify-center gap-2 px-3 text-sm"
            onClick={() => setIsMenuOpen((v) => !v)}
            type="button"
          >
            {isMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
            <span className="hidden xs:inline">{isMenuOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {isMenuOpen ? (
        <div className="navbar-mobile-menu border-t border-[var(--border)] bg-[var(--card-bg)] px-4 pb-5 pt-4 md:hidden">
          {/* Search */}
          <form action="/" className="relative">
            <input
              aria-label="Search stories"
              className="search-input w-full rounded-full border py-2.5 pl-4 pr-10 text-sm"
              defaultValue=""
              name="search"
              placeholder="Search stories…"
              type="search"
            />
            <button
              aria-label="Search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              type="submit"
            >
              <SearchIcon />
            </button>
          </form>

          {/* Links */}
          <nav className="mt-4 flex flex-col gap-0.5">
            <Link
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              href="/"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>

            {isAdminSignedIn ? (
              <>
                <Link
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  href="/admin"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Admin dashboard
                </Link>
                <p className="px-3 pt-0.5 text-xs text-[var(--text-secondary)]">
                  {adminSession?.user?.githubLogin ?? adminSession?.user?.email ?? "Admin"}
                </p>
              </>
            ) : null}

            {isPublicSignedIn ? (
              <>
                <Link
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  href="/account"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Account settings
                </Link>
                <p className="px-3 pt-0.5 text-xs text-[var(--text-secondary)]">
                  {publicSession?.user?.email ?? "reader"}
                </p>
              </>
            ) : !isAdminSignedIn ? (
              <Link
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                href={{ pathname: "/login", query: { redirectTo: pathname ?? "/" } }}
                onClick={() => setIsMenuOpen(false)}
              >
                Sign in
              </Link>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
