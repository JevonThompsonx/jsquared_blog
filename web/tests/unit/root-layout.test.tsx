import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: vi.fn(() => null),
  })),
}));

vi.mock("next/font/google", () => ({
  Lora: vi.fn(() => ({
    variable: "font-lora-variable",
  })),
}));

vi.mock("next/script", () => ({
  default: ({ src }: { src: string }) => createElement("script", { src }),
}));

vi.mock("@/components/providers/app-providers", () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => createElement("div", { "data-testid": "app-providers" }, children),
}));

vi.mock("@/components/pwa-registry", () => ({
  ServiceWorkerRegistry: () => createElement("div", { "data-testid": "service-worker-registry" }, "SW"),
}));

import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("marks the html element for smooth-scroll route transitions", async () => {
    const markup = renderToStaticMarkup(
      await RootLayout({
        children: createElement("main", null, "Child content"),
      }),
    );

    expect(markup).toContain('data-scroll-behavior="smooth"');
    expect(markup).toContain('class="font-lora-variable"');
    expect(markup).toContain('data-testid="app-providers"');
    expect(markup).toContain('data-testid="service-worker-registry"');
  });
});
