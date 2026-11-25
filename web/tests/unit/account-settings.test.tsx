// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, restorePreferenceMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  restorePreferenceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    src,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock("@workos-inc/authkit-nextjs/components", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/components/theme/theme-provider", () => ({
  useNextTheme: () => ({
    mode: "light",
    lightLook: "sage",
    darkLook: "lichen",
    lookLabel: "Moss & Linen",
    restorePreference: restorePreferenceMock,
  }),
}));

import { AccountSettings } from "@/app/account/account-settings";

describe("AccountSettings", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    useAuthMock.mockReturnValue({
      user: { id: "reader-1", email: "reader@example.com" },
      loading: false,
    });
    restorePreferenceMock.mockReset();
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the profile with the cookie session and no Authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        profile: {
          userId: "reader-1",
          displayName: "Trail Reader",
          avatarUrl: null,
          themePreference: null,
          email: "reader@example.com",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => root.render(<AccountSettings />));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Trail Reader");
    expect(fetchMock).toHaveBeenCalledWith("/api/account/profile");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init?.headers).toBeUndefined();
  });

  it("delegates password and email management to WorkOS AuthKit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          profile: {
            userId: "reader-1",
            displayName: "Trail Reader",
            avatarUrl: null,
            themePreference: null,
            email: "reader@example.com",
          },
        }),
      }),
    );

    await act(async () => root.render(<AccountSettings />));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector('input[type="password"]')).toBeNull();
    expect(container.textContent).toContain("WorkOS AuthKit");
    expect(
      container.querySelector('a[href="/api/auth/logout"]'),
    ).not.toBeNull();
  });
});
