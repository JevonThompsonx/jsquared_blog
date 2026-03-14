"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";

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

export function SiteHeader() {
  const { mode, toggleMode } = useNextTheme();
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="navbar-landing">
      <div className="container mx-auto flex max-w-full items-center justify-between gap-4 p-4">
        <Link className="site-brand text-xl font-bold sm:text-2xl" href="/">
          J²Adventures
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <nav className="nav-links flex items-center gap-2">
            <Link className="nav-link-pill" href="/">
              Home
            </Link>
            <Link className="nav-link-pill" href="/admin">
              Admin
            </Link>
          </nav>

          <form action="/" className="relative">
            <input
              aria-label="Search stories"
              className="search-input w-40 rounded-md border px-3 py-1.5 pr-10 text-sm lg:w-64"
              defaultValue=""
              name="search"
              placeholder="Search stories..."
              type="search"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-secondary)]" type="submit">
              Go
            </button>
          </form>

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

          {isSignedIn ? (
            <span className="hidden text-sm font-semibold text-[var(--text-primary)] xl:inline-flex">
              {session?.user?.githubLogin ?? session?.user?.email ?? "Admin"}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 md:hidden">
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

          <button className="nav-link-pill min-w-[4.9rem] px-3 py-2 text-sm" onClick={() => setIsMenuOpen((currentValue) => !currentValue)} type="button">
            Menu
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div className="border-t border-[var(--border)] bg-[var(--card-bg)] px-4 pb-4 pt-3 md:hidden">
          <form action="/" className="relative">
            <input
              aria-label="Search stories"
              className="search-input w-full rounded-md border px-3 py-2 pr-10 text-sm"
              defaultValue=""
              name="search"
              placeholder="Search stories..."
              type="search"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--text-secondary)]" type="submit">
              Go
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link className="text-[var(--text-primary)]" href="/" onClick={() => setIsMenuOpen(false)}>
              Home
            </Link>
            <Link className="text-[var(--text-primary)]" href="/admin" onClick={() => setIsMenuOpen(false)}>
              {isSignedIn ? "Admin dashboard" : "Admin login"}
            </Link>
            <button className="w-fit rounded-full border border-[var(--border)] px-4 py-2 text-left font-semibold text-[var(--text-primary)]" onClick={toggleMode} type="button">
              {mode === "light" ? "Switch to moon mode" : "Switch to sun mode"}
            </button>
            {isSignedIn ? <div className="text-xs leading-5 text-[var(--text-secondary)]">Signed in as {session?.user?.githubLogin ?? session?.user?.email ?? "Admin"}</div> : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
