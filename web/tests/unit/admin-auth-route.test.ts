import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authOptions, nextAuthHandler } = vi.hoisted(() => ({
  authOptions: {
    providers: ["github"],
    callbacks: { signIn: vi.fn() },
  },
  nextAuthHandler: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => nextAuthHandler),
}));

vi.mock("@/lib/auth/admin", () => ({
  buildAdminAuthOptions: vi.fn(() => authOptions),
}));

import NextAuth from "next-auth";
import { buildAdminAuthOptions } from "@/lib/auth/admin";
import { GET, POST } from "@/app/api/auth/[...nextauth]/route";

describe("admin auth route", () => {
  it("lazily builds one shared admin auth handler for GET and POST", async () => {
    expect(buildAdminAuthOptions).not.toHaveBeenCalled();
    expect(NextAuth).not.toHaveBeenCalled();

    expect(GET).not.toBe(POST);

    const getRequest = new NextRequest("http://localhost/api/auth/session");
    const postRequest = new NextRequest("http://localhost/api/auth/session", { method: "POST" });
    const getContext = { params: Promise.resolve({ nextauth: ["session"] }) };
    const postContext = { params: Promise.resolve({ nextauth: ["callback", "github"] }) };

    await GET(getRequest, getContext);

    expect(buildAdminAuthOptions).toHaveBeenCalledOnce();
    expect(NextAuth).toHaveBeenCalledWith(authOptions);
    expect(nextAuthHandler).toHaveBeenCalledWith(getRequest, getContext);

    await POST(postRequest, postContext);

    expect(buildAdminAuthOptions).toHaveBeenCalledOnce();
    expect(NextAuth).toHaveBeenCalledOnce();
    expect(nextAuthHandler).toHaveBeenCalledTimes(2);
    expect(nextAuthHandler).toHaveBeenNthCalledWith(2, postRequest, postContext);
  });
});
