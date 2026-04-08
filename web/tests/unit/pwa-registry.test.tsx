// @vitest-environment jsdom

import ReactDOMClient from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

import { ServiceWorkerRegistry } from "@/components/pwa-registry";

describe("ServiceWorkerRegistry", () => {
  const originalNavigator = window.navigator;
  const originalLocation = window.location;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();

    Object.defineProperty(window, "navigator", {
      configurable: true,
      value: originalNavigator,
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it("does not register the service worker during local development", async () => {
    process.env.NODE_ENV = "development";

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
    process.env.NODE_ENV = "production";

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
