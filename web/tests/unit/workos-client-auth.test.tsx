// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminSession } from "@/lib/auth/use-admin-session";

describe("useAdminSession", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function Probe() {
    const { session, loading } = useAdminSession();
    return (
      <div>
        <span data-loading={String(loading)} />
        <span data-admin={String(session?.user.role === "admin")} />
        <span data-email={session?.user.email ?? ""} />
      </div>
    );
  }

  it("loads the server-authorized admin session without caching", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        session: {
          user: {
            id: "local-admin",
            role: "admin",
            email: "admin@example.com",
            name: "Admin",
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => root.render(<Probe />));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/session", {
      cache: "no-store",
    });
    expect(
      container.querySelector("[data-loading]")?.getAttribute("data-loading"),
    ).toBe("false");
    expect(
      container.querySelector("[data-admin]")?.getAttribute("data-admin"),
    ).toBe("true");
    expect(
      container.querySelector("[data-email]")?.getAttribute("data-email"),
    ).toBe("admin@example.com");
  });

  it("fails closed for anonymous readers and request failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session: null }),
      })
      .mockRejectedValueOnce(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => root.render(<Probe />));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      container.querySelector("[data-admin]")?.getAttribute("data-admin"),
    ).toBe("false");

    await act(async () => root.render(<Probe key="retry" />));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(
      container.querySelector("[data-admin]")?.getAttribute("data-admin"),
    ).toBe("false");
    expect(
      container.querySelector("[data-loading]")?.getAttribute("data-loading"),
    ).toBe("false");
  });
});
