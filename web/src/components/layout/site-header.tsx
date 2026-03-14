"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { useNextTheme } from "@/components/theme/theme-provider";

export function SiteHeader() {
  const { currentTheme, toggleTheme } = useNextTheme();
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);

  return (
    <header className="navbar-landing">
      <div className="container mx-auto flex max-w-full items-center justify-between p-4">
        <Link className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl" href="/">
          J²Adventures
        </Link>

        <div className="hidden items-center space-x-4 md:flex">
          <input
            aria-label="Search placeholder"
            className="search-input w-40 rounded-md border px-3 py-1.5 text-sm lg:w-64"
            placeholder="Search..."
            readOnly
            value=""
          />

          <button
            className="relative inline-flex h-8 w-16 items-center rounded-full bg-[var(--border)] transition-all duration-300 hover:bg-[var(--text-secondary)] focus:outline-none"
            onClick={toggleTheme}
            title={currentTheme.startsWith("day") ? "Switch to Dark Mode" : "Switch to Light Mode"}
            type="button"
          >
            <span
              className={`absolute inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg transition-all duration-300 ${
                currentTheme.startsWith("day") ? "translate-x-1" : "translate-x-9"
              }`}
            >
              {currentTheme.startsWith("day") ? "O" : "C"}
            </span>
          </button>

          <nav className="flex items-center space-x-4">
            <Link className="text-[var(--text-primary)]" href="/">
              Home
            </Link>
            <Link className="text-[var(--text-primary)]" href="/admin">
              Admin
            </Link>
            {isSignedIn ? (
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {session?.user?.githubLogin ?? session?.user?.email ?? "Admin"}
              </span>
            ) : (
              <Link className="text-[var(--text-primary)]" href="/admin">
                Login
              </Link>
            )}
          </nav>
        </div>

        <div className="md:hidden flex items-center">
          <a className="text-[var(--text-primary)]" href="/admin">
            Admin
          </a>
        </div>
      </div>
    </header>
  );
}
