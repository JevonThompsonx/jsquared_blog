import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workos-inc/authkit-nextjs/components", () => ({
  AuthKitProvider: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-authkit-provider": "true" }, children),
}));

vi.mock("@/components/theme/theme-provider", () => ({
  NextThemeProvider: ({ children }: { children: React.ReactNode }) =>
    createElement("div", { "data-theme-provider": "true" }, children),
}));

vi.mock("@/components/providers/user-theme-sync", () => ({
  UserThemeSync: () => null,
}));

vi.mock("@/components/providers/navigation-scroll-fix", () => ({
  NavigationScrollFix: () => null,
}));

import { AppProviders } from "@/components/providers/app-providers";

describe("AppProviders", () => {
  it("mounts AuthKitProvider exactly once around the app providers", () => {
    const markup = renderToStaticMarkup(
      <AppProviders>
        <main>App</main>
      </AppProviders>,
    );

    expect(markup.match(/data-authkit-provider="true"/g)).toHaveLength(1);
    expect(markup).toContain('data-theme-provider="true"');
    expect(markup).toContain("App");
  });

  it("does not mount a second AuthKitProvider in the root layout", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");

    expect(layout).not.toContain("AuthKitProvider");
    expect(layout).toContain("<AppProviders>");
  });
});
