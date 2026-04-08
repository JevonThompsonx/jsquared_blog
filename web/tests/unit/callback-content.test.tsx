// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSessionMock = vi.fn();
const verifyOtpMock = vi.fn();
const getSessionMock = vi.fn();
const getSupabaseBrowserClientMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => getSupabaseBrowserClientMock(),
}));

import { CallbackContent, safeRedirectPath } from "@/app/(public-auth)/callback/callback-content";

describe("CallbackContent", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    exchangeCodeForSessionMock.mockReset();
    verifyOtpMock.mockReset();
    getSessionMock.mockReset();
    getSupabaseBrowserClientMock.mockReset();
    useSearchParamsMock.mockReset();

    useSearchParamsMock.mockReturnValue(new URLSearchParams());
    getSupabaseBrowserClientMock.mockReturnValue({
      auth: {
        exchangeCodeForSession: exchangeCodeForSessionMock,
        verifyOtp: verifyOtpMock,
        getSession: getSessionMock,
      },
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
    vi.restoreAllMocks();
  });

  async function renderComponent() {
    await act(async () => {
      root.render(<CallbackContent />);
    });

    await act(async () => {
      await Promise.resolve();
    });
  }

  it("rejects external and protocol-relative redirect targets", () => {
    expect(safeRedirectPath("https://evil.example/callback")).toBe("/");
    expect(safeRedirectPath("//evil.example/callback")).toBe("/");
    expect(safeRedirectPath("/\t/evil.example".replace("\\t", "\t"))).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
  });

  it("keeps relative redirect targets", () => {
    expect(safeRedirectPath("/account?tab=settings")).toBe("/account?tab=settings");
  });

  it("renders a generic error instead of raw auth exchange details", async () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams("code=magic-code"));
    exchangeCodeForSessionMock.mockResolvedValue({
      error: {
        message: "AuthApiError: invalid flow state leaked detail",
      },
    });

    await renderComponent();

    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("magic-code");
    expect(container.textContent).toContain("Verification failed");
    expect(container.textContent).toContain("Something went wrong. The link may have expired.");
    expect(container.textContent).not.toContain("invalid flow state leaked detail");
    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it("shows the existing explicit missing-token guidance when no session is established", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    await renderComponent();

    expect(container.textContent).toContain("No verification token found. The link may have expired.");
  });

  it("renders a generic error when auth client setup is unavailable", async () => {
    getSupabaseBrowserClientMock.mockImplementation(() => {
      throw new Error("missing env");
    });

    await renderComponent();

    expect(container.textContent).toContain("Something went wrong. The link may have expired.");
    expect(container.textContent).not.toContain("Auth is not configured.");
  });
});
