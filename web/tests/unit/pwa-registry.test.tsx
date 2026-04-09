// @vitest-environment jsdom

import ReactDOMClient from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

import { ServiceWorkerRegistry } from "@/components/pwa-registry";

describe("ServiceWorkerRegistry", () => {
  const originalNavigator = window.navigator;
  const originalLocation = window.location;

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllEnvs();

    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: originalNavigator,
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("does not register the service worker during local development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const register = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: {
        ...originalNavigator,
        serviceWorker: {
          register,
        },
      },
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL("http://localhost:3000"),
    });

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<ServiceWorkerRegistry />);
    });

    expect(register).not.toHaveBeenCalled();

    root.unmount();
  });

  it("registers the service worker on secure production pages", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const register = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: {
        ...originalNavigator,
        serviceWorker: {
          register,
        },
      },
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL("https://jsquaredadventures.com"),
    });

    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = ReactDOMClient.createRoot(container);
    await act(async () => {
      root.render(<ServiceWorkerRegistry />);
    });

    expect(register).toHaveBeenCalledWith("/sw.js");

    root.unmount();
  });
});
