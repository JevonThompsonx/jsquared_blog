"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Session as AdminSession } from "next-auth";

interface MobileNavProps {
  adminSession: AdminSession | null;
  publicSession: Session | null;
  currentSearch: string;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSearchChange: (value: string) => void;
  ThemeToggle: React.ComponentType;
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

export function MobileNav({
  adminSession,
  publicSession,
  currentSearch,
  onSearchSubmit,
  onSearchChange,
  ThemeToggle,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isAdminSignedIn = Boolean(adminSession?.user);
  const isPublicSignedIn = Boolean(publicSession?.user);
  const closeMenu = () => setIsOpen(false);

  return (
    <div className="flex items-center gap-2 md:hidden">
      <ThemeToggle />

      <Dialog.Root onOpenChange={setIsOpen} open={isOpen}>
        <Dialog.Trigger asChild>
          <button
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="nav-link-pill flex h-11 min-w-[2.75rem] items-center justify-center gap-2 px-3 text-sm"
            type="button"
          >
            {isOpen ? <CloseIcon /> : <HamburgerIcon />}
            <span className="hidden xs:inline">{isOpen ? "Close" : "Menu"}</span>
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300" />
          <Dialog.Content className="navbar-mobile-menu fixed inset-x-0 top-0 z-50 flex max-h-[calc(100vh-2rem)] flex-col overflow-y-auto border-b border-[var(--border)] bg-[var(--card-bg)] px-4 pb-8 pt-[4.5rem] shadow-2xl animate-in slide-in-from-top duration-300 focus:outline-none">
            <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>
            <Dialog.Description className="sr-only">Access site links and search.</Dialog.Description>

            {/* Search Section */}
            <div className="mb-6">
              <form action="/" className="relative" onSubmit={(e) => {
                onSearchSubmit(e);
                setIsOpen(false);
              }}>
                <input
                  aria-label="Search stories"
                  className="search-input w-full rounded-2xl border py-3 pl-4 pr-12 text-base shadow-sm focus:ring-2 focus:ring-[var(--primary)]"
                  defaultValue={currentSearch}
                  key={`mobile-search:${pathname}:${currentSearch}`}
                  name="search"
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search stories…"
                  type="search"
                />
                <button
                  aria-label="Submit search"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--primary)]"
                  type="submit"
                >
                  <SearchIcon />
                </button>
              </form>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-1.5">
              <Link
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all ${
                  pathname === "/" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                }`}
                href="/"
                onClick={closeMenu}
              >
                Home
              </Link>
              <Link
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all ${
                  pathname === "/map" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                }`}
                href="/map"
                onClick={closeMenu}
              >
                Map
              </Link>
              <Link
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all ${
                  pathname === "/about" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                }`}
                href="/about"
                onClick={closeMenu}
              >
                About
              </Link>

              {isAdminSignedIn && (
                <div className="mt-4 flex flex-col gap-1.5">
                  <div className="px-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]/60">Admin</div>
                  <Link
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all ${
                        pathname?.startsWith("/admin") ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                      }`}
                      href="/admin"
                      onClick={closeMenu}
                    >
                      Dashboard
                    </Link>
                  <div className="px-4 pb-2 text-xs text-[var(--text-secondary)]">
                    Logged in as <span className="font-semibold text-[var(--accent)]">{adminSession?.user?.githubLogin ?? adminSession?.user?.email}</span>
                  </div>
                </div>
              )}

              {isPublicSignedIn ? (
                <div className="mt-4 flex flex-col gap-1.5">
                  <div className="px-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]/60">Account</div>
                  <Link
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all ${
                        pathname === "/bookmarks" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                      }`}
                      href="/bookmarks"
                      onClick={closeMenu}
                    >
                      Saved posts
                    </Link>
                  <Link
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all ${
                        pathname === "/account" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                      }`}
                      href="/account"
                      onClick={closeMenu}
                    >
                      Account settings
                    </Link>
                  <div className="px-4 text-xs text-[var(--text-secondary)]">
                    {publicSession?.user?.email}
                  </div>
                </div>
              ) : !isAdminSignedIn && (
                <Link
                  className="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-[var(--btn-bg)] px-4 py-3.5 text-base font-bold text-[var(--btn-text)] shadow-lg shadow-[var(--btn-bg)]/20 transition-all active:scale-95"
                  href={{ pathname: "/login", query: { redirectTo: pathname ?? "/" } }}
                  onClick={closeMenu}
                >
                  Sign in
                </Link>
              )}
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
