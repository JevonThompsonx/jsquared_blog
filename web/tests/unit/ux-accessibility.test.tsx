// @vitest-environment jsdom

import { existsSync } from "node:fs";
import path from "node:path";

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockHref =
  string | { pathname?: string; query?: Record<string, string | undefined> };

function resolveMockHref(href: MockHref | undefined): string {
  if (typeof href === "string") return href;
  if (!href) return "#";

  const search = Object.entries(href.query ?? {})
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
    )
    .join("&");

  return `${href.pathname ?? "#"}${search ? `?${search}` : ""}`;
}

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href?: MockHref;
  }) => (
    <a href={resolveMockHref(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/posts/demo",
}));

vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  formatRelativeDate: () => "3 days ago",
  formatSeasonYear: () => "Winter 2025",
}));

const getSessionMock = vi.fn(async () => ({ data: { session: null } }));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => undefined } },
      }),
    },
  }),
}));

import { AccountPageFallback } from "@/app/account/page";
import ErrorPage from "@/app/error";
import GlobalError from "@/app/global-error";
import manifest from "@/app/manifest";
import NotFound from "@/app/not-found";
import { PostDate } from "@/components/blog/post-date";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { Comments } from "@/components/blog/comments";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, String(value));
    },
  };
}

describe("error and 404 pages", () => {
  it("404 renders one h1 inside the main-content landmark and drops admin copy", () => {
    const markup = renderToStaticMarkup(<NotFound />);

    expect(markup).toContain("<main");
    expect(markup).toContain('id="main-content"');
    expect(markup.match(/<h1\b/g)?.length).toBe(1);
    expect(markup).not.toMatch(/admin dashboard/i);
  });

  it("route error renders one h1 inside the main-content landmark", () => {
    const markup = renderToStaticMarkup(
      <ErrorPage error={new Error("boom")} reset={() => undefined} />,
    );

    expect(markup).toContain('id="main-content"');
    expect(markup.match(/<h1\b/g)?.length).toBe(1);
  });

  it("global error renders one h1 inside the main-content landmark", () => {
    const markup = renderToStaticMarkup(
      <GlobalError error={new Error("boom")} reset={() => undefined} />,
    );

    expect(markup).toContain('id="main-content"');
    expect(markup.match(/<h1\b/g)?.length).toBe(1);
  });

  it("account shell fallback exposes an h1 and a sign-in path", () => {
    const markup = renderToStaticMarkup(<AccountPageFallback />);

    expect(markup.match(/<h1\b/g)?.length).toBe(1);
    expect(markup).toContain("Account Settings");
    expect(markup).toContain("/login?redirectTo=%2Faccount");
  });
});

describe("PWA manifest assets", () => {
  it("every icon and screenshot URL resolves to a file in public/", () => {
    const m = manifest();

    for (const icon of m.icons ?? []) {
      expect(icon.src.startsWith("/")).toBe(true);
      const file = path.join(process.cwd(), "public", icon.src.slice(1));
      expect(existsSync(file), `missing manifest asset: ${icon.src}`).toBe(
        true,
      );
    }

    for (const shot of m.screenshots ?? []) {
      expect(shot.src.startsWith("/")).toBe(true);
      const file = path.join(process.cwd(), "public", shot.src.slice(1));
      expect(existsSync(file), `missing manifest asset: ${shot.src}`).toBe(
        true,
      );
    }
  });

  it("declares PNG 192 and 512 icons for Android install", () => {
    const m = manifest();
    const sizes = (m.icons ?? []).map((icon) => icon.sizes);

    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });
});

describe("PostDate", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const storage = createMemoryStorage();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: storage,
    });
    vi.stubGlobal("localStorage", storage);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("is a real button that toggles the stored date format", () => {
    act(() => {
      root.render(<PostDate dateString="2025-01-02T00:00:00.000Z" />);
    });

    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.textContent).toContain("Winter 2025");

    act(() => {
      button?.click();
    });

    expect(container.querySelector("button")?.textContent).toContain(
      "3 days ago",
    );
    expect(window.localStorage.getItem("j2_date_format")).toBe("relative");
  });
});

describe("TableOfContents reduced motion", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses instant scrolling when prefers-reduced-motion is set", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const scrollIntoView = vi.fn();
    const target = document.createElement("h2");
    target.id = "intro";
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);

    act(() => {
      root.render(
        <TableOfContents
          headings={[{ id: "intro", text: "Intro", level: 2 }]}
        />,
      );
    });

    const link = container.querySelector('a[href="#intro"]');
    act(() => {
      link?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
    target.remove();
  });
});

describe("Comments fetch failure", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("announces the failure and offers a retry", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root.render(<Comments postId="post-1" />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(
      "Comments could not be loaded right now.",
    );

    const retry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Try again"),
    );
    expect(retry).toBeTruthy();

    await act(async () => {
      retry?.click();
    });

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
