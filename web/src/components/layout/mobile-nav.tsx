"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { ClientAdminSession } from "@/lib/auth/use-admin-session";
import { adminDashboardHref, adminNavLinks } from "@/lib/admin/navigation";

interface MobileNavProps {
  adminSession: ClientAdminSession | null;
  publicUser: { email: string } | null;
  currentSearch: string;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSearchChange: (value: string) => void;
  ThemeToggle: React.ComponentType;
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}

export function MobileNav({
  adminSession,
  publicUser,
  currentSearch,
  onSearchSubmit,
  onSearchChange,
  ThemeToggle,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isAdminSignedIn = adminSession?.user.role === "admin";
  const isPublicSignedIn = Boolean(publicUser);
  const closeMenu = () => setIsOpen(false);

  return (
    <div className="flex items-center gap-2 md:hidden">
      <ThemeToggle />

      <Dialog.Root onOpenChange={setIsOpen} open={isOpen}>
        <Dialog.Trigger asChild>
          <button
            aria-expanded={isOpen}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            className="nav-link-pill flex h-11 min-w-[2.75rem] items-center justify-center gap-2 px-3 text-sm"
            type="button"
          >
            {isOpen ? <CloseIcon /> : <HamburgerIcon />}
            <span className="hidden min-[480px]:inline">
              {isOpen ? "Close" : "Menu"}
            </span>
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300" />
          <Dialog.Content className="navbar-mobile-menu fixed inset-x-0 top-0 z-50 flex max-h-[calc(100vh-2rem)] flex-col overflow-y-auto border-b border-[var(--border)] bg-[var(--card-bg)] px-4 pb-8 pt-[4.5rem] shadow-2xl animate-in slide-in-from-top duration-300 focus:outline-none">
            <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>
            <Dialog.Description className="sr-only">
              Access site links and search.
            </Dialog.Description>

            {/* Search Section */}
            <div className="mb-6">
              <form
                action="/search"
                className="relative"
                onSubmit={(e) => {
                  onSearchSubmit(e);
                  setIsOpen(false);
                }}
              >
                <input
                  aria-label="Search stories"
                  className="search-input w-full rounded-2xl border py-3 pl-4 pr-12 text-base shadow-sm focus:ring-2 focus:ring-[var(--primary)]"
                  defaultValue={currentSearch}
                  key={`mobile-search:${pathname}:${currentSearch}`}
                  name="q"
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search stories… (⌘K)"
                  type="search"
                />
                <button
                  aria-label="Submit search"
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)]"
                  type="submit"
                >
                  <SearchIcon />
                </button>
              </form>
            </div>

            {/* Navigation Links */}
            <nav
              aria-label="Mobile navigation"
              className="flex flex-col gap-1.5"
            >
              <Link
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] ${
                  pathname === "/"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                }`}
                aria-current={pathname === "/" ? "page" : undefined}
                href="/"
                onClick={closeMenu}
              >
                Home
              </Link>
              <Link
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] ${
                  pathname === "/map"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                }`}
                aria-current={pathname === "/map" ? "page" : undefined}
                href="/map"
                onClick={closeMenu}
              >
                Map
              </Link>
              <Link
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] ${
                  pathname === "/categories"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                }`}
                aria-current={pathname === "/categories" ? "page" : undefined}
                href="/categories"
                onClick={closeMenu}
              >
                Categories
              </Link>
              <Link
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] ${
                  pathname === "/tags"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                }`}
                aria-current={pathname === "/tags" ? "page" : undefined}
                href="/tags"
                onClick={closeMenu}
              >
                Tags
              </Link>
              <Link
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] ${
                  pathname === "/about"
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                }`}
                aria-current={pathname === "/about" ? "page" : undefined}
                href="/about"
                onClick={closeMenu}
              >
                About
              </Link>

              {isAdminSignedIn && (
                <div className="mt-4 flex flex-col gap-1.5">
                  <div className="px-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]/60">
                    Admin
                  </div>
                  {adminNavLinks.map((link) => {
                    const isActive =
                      link.href === adminDashboardHref
                        ? pathname === adminDashboardHref
                        : pathname === link.href;

                    return (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        key={link.href}
                        className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] ${
                          isActive
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                        }`}
                        href={link.href}
                        onClick={closeMenu}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                  <div className="px-4 pb-2 text-xs text-[var(--text-secondary)]">
                    Logged in as{" "}
                    <span className="font-semibold text-[var(--accent)]">
                      {adminSession?.user.name ?? adminSession?.user.email}
                    </span>
                  </div>
                </div>
              )}

              {isPublicSignedIn ? (
                <div className="mt-4 flex flex-col gap-1.5">
                  <div className="px-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]/60">
                    Account
                  </div>
                  <Link
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] ${
                      pathname === "/bookmarks"
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                    }`}
                    aria-current={
                      pathname === "/bookmarks" ? "page" : undefined
                    }
                    href="/bookmarks"
                    onClick={closeMenu}
                  >
                    Saved posts
                  </Link>
                  <Link
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] ${
                      pathname === "/account"
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--accent-soft)]/50"
                    }`}
                    aria-current={pathname === "/account" ? "page" : undefined}
                    href="/account"
                    onClick={closeMenu}
                  >
                    Account settings
                  </Link>
                  <div className="px-4 text-xs text-[var(--text-secondary)]">
                    {publicUser?.email}
                  </div>
                </div>
              ) : (
                !isAdminSignedIn && (
                  <Link
                    className="mt-4 flex items-center justify-center gap-3 rounded-2xl bg-[var(--btn-bg)] px-4 py-3.5 text-base font-bold text-[var(--btn-text)] shadow-lg shadow-[var(--btn-bg)]/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)] active:scale-95"
                    href={{
                      pathname: "/login",
                      query: { redirectTo: pathname ?? "/" },
                    }}
                    onClick={closeMenu}
                  >
                    Sign in
                  </Link>
                )
              )}
            </nav>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
