import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isListmonkConfigured,
  ListmonkError,
  subscribeToListmonk,
} from "@/lib/email/listmonk";

const ENV_KEYS = [
  "LISTMONK_URL",
  "LISTMONK_LIST_UUID",
  "LISTMONK_ACCESS_CLIENT_ID",
  "LISTMONK_ACCESS_CLIENT_SECRET",
] as const;

function setListmonkEnv(
  extra: Partial<Record<(typeof ENV_KEYS)[number], string>> = {},
) {
  process.env.LISTMONK_URL = "https://listmonk.example.com";
  process.env.LISTMONK_LIST_UUID = "list-uuid";
  for (const [key, value] of Object.entries(extra)) {
    process.env[key] = value;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Listmonk subscription client", () => {
  const original = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<string, string | undefined>;

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    vi.restoreAllMocks();
  });

  it("reports missing configuration", () => {
    delete process.env.LISTMONK_URL;
    delete process.env.LISTMONK_LIST_UUID;

    expect(isListmonkConfigured()).toBe(false);
  });

  it("posts a pending subscription with the list UUID", async () => {
    setListmonkEnv();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: true }));

    await subscribeToListmonk(
      { email: "reader@example.com", name: "Jevon" },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://listmonk.example.com/api/public/subscription");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      email: "reader@example.com",
      name: "Jevon",
      list_uuids: ["list-uuid"],
    });
  });

  it("adds Access service-token headers when configured", async () => {
    setListmonkEnv({
      LISTMONK_ACCESS_CLIENT_ID: "client-id",
      LISTMONK_ACCESS_CLIENT_SECRET: "client-secret",
    });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: true }));

    await subscribeToListmonk({ email: "reader@example.com" }, fetchMock);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["CF-Access-Client-Id"]).toBe("client-id");
    expect(headers["CF-Access-Client-Secret"]).toBe("client-secret");
  });

  it("throws when Listmonk returns an error status", async () => {
    setListmonkEnv();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 503));

    await expect(
      subscribeToListmonk({ email: "reader@example.com" }, fetchMock),
    ).rejects.toBeInstanceOf(ListmonkError);
  });

  it("accepts the Listmonk opt-in acknowledgement object", async () => {
    setListmonkEnv();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { has_optin: true } }));

    await expect(
      subscribeToListmonk({ email: "reader@example.com" }, fetchMock),
    ).resolves.toBeUndefined();
  });

  it("accepts an already-confirmed or blocked acknowledgement", async () => {
    setListmonkEnv();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { has_optin: false } }));

    await expect(
      subscribeToListmonk({ email: "reader@example.com" }, fetchMock),
    ).resolves.toBeUndefined();
  });

  it("requires an acknowledgement object", async () => {
    setListmonkEnv();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: null }));

    await expect(
      subscribeToListmonk({ email: "reader@example.com" }, fetchMock),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("rejects non-JSON responses", async () => {
    setListmonkEnv();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("ok", {
        status: 200,
        headers: { "content-type": "text/plain" },
      }),
    );

    await expect(
      subscribeToListmonk({ email: "reader@example.com" }, fetchMock),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("fails without configuration", async () => {
    delete process.env.LISTMONK_URL;
    delete process.env.LISTMONK_LIST_UUID;
    const fetchMock = vi.fn();

    await expect(
      subscribeToListmonk({ email: "reader@example.com" }, fetchMock),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
