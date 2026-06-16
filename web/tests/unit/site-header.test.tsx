// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const usePathnameMock = vi.fn(() => "/");
const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
const useRouterMock = vi.fn(() => ({ push: routerPushMock, replace: routerReplaceMock }));
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
    routerPushMock.mockReset();
    routerReplaceMock.mockReset();
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

  it("renders taxonomy browse links in the public navigation", async () => {
    sessionContextValueMock.mockReturnValue(undefined);

    await renderHeader();

    const tagsLink = container.querySelector('a[href="/tags"]');
    const categoriesLink = container.querySelector('a[href="/categories"]');

    expect(tagsLink).not.toBeNull();
    expect(tagsLink?.textContent).toContain("Tags");
    expect(categoriesLink).not.toBeNull();
    expect(categoriesLink?.textContent).toContain("Categories");
  });

  it("renders the search form with /search action, q param name, and Cmd+K placeholder", async () => {
    sessionContextValueMock.mockReturnValue(undefined);

    await renderHeader();

    const form = container.querySelector('form[action="/search"]');
    expect(form).not.toBeNull();
    const input = form?.querySelector('input[name="q"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute("placeholder")).toBe("Search stories… (⌘K)");
  });

  it("navigates to /search?q=... when the search form is submitted", async () => {
    sessionContextValueMock.mockReturnValue(undefined);
    usePathnameMock.mockReturnValue("/");

    await renderHeader();

    const form = container.querySelector('form[action="/search"]') as HTMLFormElement | null;
    const input = form?.querySelector('input[name="q"]') as HTMLInputElement | null;
    expect(form).not.toBeNull();
    expect(input).not.toBeNull();

    await act(async () => {
      input!.value = "Zion";
      form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(routerPushMock).toHaveBeenCalledWith("/search?q=Zion");
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("navigates to /search?q=... when the form is submitted from a non-home page", async () => {
    sessionContextValueMock.mockReturnValue(undefined);
    usePathnameMock.mockReturnValue("/tags");

    await renderHeader();

    const form = container.querySelector('form[action="/search"]') as HTMLFormElement | null;
    const input = form?.querySelector('input[name="q"]') as HTMLInputElement | null;
    expect(form).not.toBeNull();
    expect(input).not.toBeNull();

    await act(async () => {
      input!.value = "Hiking";
      form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(routerPushMock).toHaveBeenCalledWith("/search?q=Hiking");
  });

  it("focuses the search input when Cmd+K (macOS) is pressed", async () => {
    sessionContextValueMock.mockReturnValue(undefined);

    await renderHeader();

    const input = container.querySelector('input[name="q"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const shortcutEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "k",
      metaKey: true,
    });
    const preventDefaultSpy = vi.spyOn(shortcutEvent, "preventDefault");

    await act(async () => {
      window.dispatchEvent(shortcutEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });

  it("focuses the search input when Ctrl+K (Windows/Linux) is pressed", async () => {
    sessionContextValueMock.mockReturnValue(undefined);

    await renderHeader();

    const input = container.querySelector('input[name="q"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const shortcutEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "k",
      ctrlKey: true,
    });
    const preventDefaultSpy = vi.spyOn(shortcutEvent, "preventDefault");

    await act(async () => {
      window.dispatchEvent(shortcutEvent);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });

  it("does not focus the search input or prevent default for unrelated keyboard shortcuts", async () => {
    sessionContextValueMock.mockReturnValue(undefined);

    await renderHeader();

    const input = container.querySelector('input[name="q"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    input?.blur();
    expect(document.activeElement).not.toBe(input);

    const shortcutEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "k",
    });
    const preventDefaultSpy = vi.spyOn(shortcutEvent, "preventDefault");

    await act(async () => {
      window.dispatchEvent(shortcutEvent);
    });

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(input);
  });

  it("removes the keydown listener on unmount", async () => {
    sessionContextValueMock.mockReturnValue(undefined);

    await renderHeader();

    const input = container.querySelector('input[name="q"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    await act(async () => {
      root.unmount();
    });

    const shortcutEvent = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "k",
      metaKey: true,
    });
    const preventDefaultSpy = vi.spyOn(shortcutEvent, "preventDefault");

    await act(async () => {
      window.dispatchEvent(shortcutEvent);
    });

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(input);

    container.remove();
  });
});
