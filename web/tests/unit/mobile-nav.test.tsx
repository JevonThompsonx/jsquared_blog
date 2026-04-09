// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.fn(() => "/");

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("@radix-ui/react-dialog", () => {
  const React = require("react") as typeof import("react");

  return {
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: ({ className }: { className?: string }) => <div className={className} />,
    Content: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
    Title: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
    Description: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  };
});

import { MobileNav } from "@/components/layout/mobile-nav";

describe("MobileNav", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    usePathnameMock.mockReturnValue("/");
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderNav(adminSession: { user?: { id?: string; role?: string; githubLogin?: string | null; email?: string | null } } | null) {
    await act(async () => {
      root.render(
        <MobileNav
          adminSession={adminSession as never}
          currentSearch=""
          onSearchChange={() => {}}
          onSearchSubmit={(event) => event.preventDefault()}
          publicSession={null}
          ThemeToggle={() => <div>Theme</div>}
        />,
      );
    });
  }

  it("shows admin destinations for admin-role sessions", async () => {
    await renderNav({
      user: {
        id: "admin-1",
        role: "admin",
        githubLogin: "octoadmin",
      },
    });

    expect(container.textContent).toContain("Admin");
    expect(container.textContent).toContain("Dashboard");
    expect(container.querySelector('a[href="/admin"]')).not.toBeNull();
    expect(container.querySelector('a[href="/admin/posts/new"]')?.textContent).toContain("New post");
    expect(container.querySelector('a[href="/admin/wishlist"]')?.textContent).toContain("Travel wishlist");
    expect(container.querySelector('a[href="/admin/tags"]')?.textContent).toContain("Manage tags");
  });

  it("keeps admin destinations hidden for non-admin sessions", async () => {
    await renderNav({
      user: {
        id: "reader-1",
        role: "reader",
        githubLogin: "octoreader",
      },
    });

    expect(container.textContent).not.toContain("Dashboard");
    expect(container.querySelector('a[href="/admin"]')).toBeNull();
    expect(container.textContent).toContain("Sign in");
  });

  it("marks only the current admin destination as active", async () => {
    usePathnameMock.mockReturnValue("/admin/wishlist");

    await renderNav({
      user: {
        id: "admin-1",
        role: "admin",
        githubLogin: "octoadmin",
      },
    });

    const activeLinks = Array.from(container.querySelectorAll("a")).filter((link) =>
      link.className.includes("bg-[var(--accent-soft)] text-[var(--accent)]"),
    );

    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0]?.getAttribute("href")).toBe("/admin/wishlist");
  });
});
