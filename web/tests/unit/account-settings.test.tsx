// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const getSupabaseBrowserClientMock = vi.fn();
const restorePreferenceMock = vi.fn();

vi.mock("next/image", () => ({
  default: ({ alt, src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} {...props} />
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => getSupabaseBrowserClientMock(),
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

    getSessionMock.mockReset();
    getSupabaseBrowserClientMock.mockReset();
    restorePreferenceMock.mockReset();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderComponent() {
    await act(async () => {
      root.render(<AccountSettings />);
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  function createFetchResponse(body: unknown, ok = true) {
    return {
      ok,
      json: async () => body,
    };
  }

  it("shows a stable load error when the profile request rejects", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }),
      },
    });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network offline")));

    await renderComponent();

    expect(container.textContent).toContain("Failed to load profile. Please refresh.");
  });

  it("shows a stable load error when session lookup rejects", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        getSession: getSessionMock.mockRejectedValue(new Error("session failed")),
      },
    });

    await renderComponent();

    expect(container.textContent).toContain("Failed to load profile. Please refresh.");
  });

  it("shows a stable load error when the Supabase client cannot be created", async () => {
    getSupabaseBrowserClientMock.mockImplementation(() => {
      throw new Error("missing public env");
    });

    await renderComponent();

    expect(container.textContent).toContain("Failed to load profile. Please refresh.");
  });

  it("shows a stable load error when the profile payload is malformed", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }),
      },
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ profile: { userId: "user-1" } }),
    }));

    await renderComponent();

    expect(container.textContent).toContain("Failed to load profile. Please refresh.");
    expect(restorePreferenceMock).not.toHaveBeenCalled();
  });

  it("saves the current theme preference through the profile PATCH boundary", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }),
      },
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createFetchResponse({
        profile: {
          userId: "user-1",
          displayName: "Traveler",
          avatarUrl: null,
          themePreference: null,
          email: "traveler@example.com",
        },
      }))
      .mockResolvedValueOnce(createFetchResponse({ success: true }));

    vi.stubGlobal("fetch", fetchMock);

    await renderComponent();

    const saveThemeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save current theme as preference"),
    );

    expect(saveThemeButton).toBeTruthy();

    await act(async () => {
      saveThemeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/account/profile",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          themePreference: JSON.stringify({
            mode: "light",
            lightLook: "sage",
            darkLook: "lichen",
          }),
        }),
      }),
    );
    expect(container.textContent).toContain("Theme preference saved.");
  });

  it("shows a stable save error when theme preference PATCH returns non-ok", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }),
      },
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createFetchResponse({
        profile: {
          userId: "user-1",
          displayName: "Traveler",
          avatarUrl: null,
          themePreference: null,
          email: "traveler@example.com",
        },
      }))
      .mockResolvedValueOnce(createFetchResponse({ error: "save failed" }, false));

    vi.stubGlobal("fetch", fetchMock);

    await renderComponent();

    const saveThemeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save current theme as preference"),
    );

    await act(async () => {
      saveThemeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Failed to save theme preference.");
    expect(container.textContent).not.toContain("Theme preference saved.");
  });

  it("shows a stable save error when theme preference PATCH rejects", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        getSession: getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-1" } } }),
      },
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createFetchResponse({
        profile: {
          userId: "user-1",
          displayName: "Traveler",
          avatarUrl: null,
          themePreference: null,
          email: "traveler@example.com",
        },
      }))
      .mockRejectedValueOnce(new Error("network offline"));

    vi.stubGlobal("fetch", fetchMock);

    await renderComponent();

    const saveThemeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save current theme as preference"),
    );

    await act(async () => {
      saveThemeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Failed to save theme preference.");
    expect(container.textContent).not.toContain("Theme preference saved.");
  });

  it("uses the latest session token for profile updates", async () => {
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        getSession: getSessionMock
          .mockResolvedValueOnce({ data: { session: { access_token: "token-1" } } })
          .mockResolvedValueOnce({ data: { session: { access_token: "token-2" } } }),
      },
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(createFetchResponse({
        profile: {
          userId: "user-1",
          displayName: "Traveler",
          avatarUrl: null,
          themePreference: null,
          email: "traveler@example.com",
        },
      }))
      .mockResolvedValueOnce(createFetchResponse({ success: true }));

    vi.stubGlobal("fetch", fetchMock);

    await renderComponent();

    const saveThemeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save current theme as preference"),
    );

    await act(async () => {
      saveThemeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(getSessionMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/account/profile",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer token-2",
          "Content-Type": "application/json",
        }),
      }),
    );
  });
});
