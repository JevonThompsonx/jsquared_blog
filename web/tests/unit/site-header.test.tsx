// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.fn(() => "/");
const useRouterMock = vi.fn(() => ({ push: vi.fn(), replace: vi.fn() }));
const useSearchParamsMock = vi.fn(() => new URLSearchParams());
const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
const sessionContextValueMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => useRouterMock(),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("next-auth/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-auth/react")>();
  return {
    ...actual,
    useSession: vi.fn(),
  };
});

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  }),
}));

vi.mock("@/components/theme/theme-provider", () => ({
  useNextTheme: () => ({
    mode: "light",
    toggleMode: vi.fn(),
  }),
}));

vi.mock("@/components/layout/mobile-nav", () => ({
  MobileNav: () => null,
}));

import { SiteHeader } from "@/components/layout/site-header";
import { SessionContext } from "next-auth/react";

describe("SiteHeader", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    usePathnameMock.mockReturnValue("/");
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue({ data: { session: null } });
    onAuthStateChangeMock.mockClear();
    sessionContextValueMock.mockReset();
    sessionContextValueMock.mockReturnValue(undefined);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderHeader() {
    await act(async () => {
      root.render(
        <SessionContext.Provider value={sessionContextValueMock()}>
          <SiteHeader />
        </SessionContext.Provider>,
      );
    });

    await act(async () => {
      await Promise.resolve();
    });
  }

  it("shows the admin nav entry only for admin-role sessions", async () => {
    sessionContextValueMock.mockReturnValue({
      data: {
        user: {
          id: "admin-1",
          role: "admin",
          githubLogin: "octoadmin",
        },
      },
    });

    await renderHeader();

    const adminLink = container.querySelector('a[href="/admin"]');
    expect(adminLink?.textContent).toContain("Admin");
    expect(container.querySelector('a[href="/login?redirectTo=/"]')).toBeNull();
  });

  it("keeps the admin nav entry hidden for non-admin sessions", async () => {
    sessionContextValueMock.mockReturnValue({
      data: {
        user: {
          id: "reader-1",
          role: "reader",
          githubLogin: "octoreader",
        },
      },
    });

    await renderHeader();

    expect(container.querySelector('a[href="/admin"]')).toBeNull();
    expect(container.textContent).toContain("Sign in");
  });

  it("falls back to public navigation when the next-auth provider is unavailable", async () => {
    sessionContextValueMock.mockReturnValue(undefined);

    await renderHeader();

    expect(container.querySelector('a[href="/admin"]')).toBeNull();
    expect(container.textContent).toContain("Sign in");
  });
});
