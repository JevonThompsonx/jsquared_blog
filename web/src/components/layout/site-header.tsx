"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

import { MobileNav } from "./mobile-nav";

export function ThemeToggle() {
  const { mode, toggleMode } = useNextTheme();

  return (
    <button
      aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className="relative inline-flex h-11 w-[5.4rem] shrink-0 items-center rounded-full border border-[var(--border)] bg-[var(--card-bg)] px-1 shadow-sm transition-all duration-300 hover:border-[var(--primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      onClick={toggleMode}
      title={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      type="button"
    >
      <span className="flex w-full items-center justify-between px-1.5 text-[var(--text-secondary)] opacity-70">
        <SunIcon />
        <MoonIcon />
      </span>
      <span
        className={`absolute inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] shadow-lg transition-all duration-300 ${
          mode === "light" ? "translate-x-0" : "translate-x-[2.85rem]"
        }`}
      >
        {mode === "light" ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}

export function SiteHeader() {
  const { data: adminSession } = useSession();
  const isAdminSignedIn = Boolean(adminSession?.user?.id);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [publicSession, setPublicSession] = useState<Session | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const currentSearch = searchParams?.get("search") ?? "";

  function navigateToSearch(value: string, mode: "push" | "replace") {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const trimmedValue = value.trim();

    if (trimmedValue) {
      params.set("search", trimmedValue);
    } else {
      params.delete("search");
    }

    const nextUrl: "/" | `/?${string}` = params.toString() ? `/?${params.toString()}` : "/";

    if (mode === "replace") {
      router.replace(nextUrl);
      return;
    }

    router.push(nextUrl);
  }

  function clearPendingSearchNavigation() {
    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedValue = formData.get("search");
    clearPendingSearchNavigation();
    navigateToSearch(typeof submittedValue === "string" ? submittedValue : "", "push");
  }

  function handleSearchChange(value: string) {
    clearPendingSearchNavigation();

    searchDebounceRef.current = window.setTimeout(() => {
      if (value !== currentSearch && (pathname === "/" || value.trim())) {
        navigateToSearch(value, "replace");
      }
      searchDebounceRef.current = null;
    }, 300);
  }

  useEffect(() => clearPendingSearchNavigation, []);

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

  const isPublicSignedIn = Boolean(publicSession?.user);

  return (
    <header className="navbar-landing">
      <div className="container mx-auto flex max-w-full items-center justify-between gap-4 p-4">
        <Link className="site-brand text-xl font-bold sm:text-2xl" href="/">
          J²Adventures
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          <nav className="flex items-center gap-1">
            <Link className="nav-link-pill" href="/">
              Home
            </Link>
            <Link className="nav-link-pill" href="/map">
              Map
            </Link>
            <Link className="nav-link-pill" href="/about">
              About
            </Link>
          </nav>

          <form action="/" className="relative" onSubmit={handleSearchSubmit}>
            <input
              aria-label="Search stories"
              className="search-input w-40 rounded-full border py-2 pl-4 pr-9 text-sm transition-[width] duration-200 focus:w-52 lg:w-52 lg:focus:w-64"
              defaultValue={currentSearch}
              key={`desktop-search:${pathname}:${currentSearch}`}
              name="search"
              onChange={(e) => handleSearchChange(e.target.value)}
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
            <>
              <Link className="nav-link-pill text-sm" href="/bookmarks">
                Saved
              </Link>
              <Link className="nav-link-pill text-sm" href="/account">
                Account
              </Link>
            </>
          ) : !isAdminSignedIn ? (
            <Link className="nav-link-pill text-sm" href={{ pathname: "/login", query: { redirectTo: pathname ?? "/" } }}>
              Sign in
            </Link>
          ) : null}

          {isAdminSignedIn ? (
            <Link className="max-w-[10rem] truncate text-sm font-semibold text-[var(--accent)] hover:underline" href="/admin">
              {adminSession?.user?.githubLogin ?? adminSession?.user?.email ?? "Admin"}
            </Link>
          ) : null}
        </div>

        {/* Mobile Nav */}
        <MobileNav
          adminSession={adminSession}
          currentSearch={currentSearch}
          key={pathname ?? "/"}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          publicSession={publicSession}
          ThemeToggle={ThemeToggle}
        />
      </div>
    </header>
  );
}
