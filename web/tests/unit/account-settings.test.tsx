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
});
