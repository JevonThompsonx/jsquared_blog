import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectError = new Error("NEXT_REDIRECT");

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw redirectError; }),
}));

import SettingsPage from "@/app/settings/page";
import { redirect } from "next/navigation";

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects the legacy settings route to /account", () => {
    expect(() => SettingsPage()).toThrow(redirectError);

    expect(redirect).toHaveBeenCalledWith("/account");
  });
});
