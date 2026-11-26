import "server-only";

import { getEnvSource } from "@/lib/env";

const REQUEST_TIMEOUT_MS = 8_000;

export type ListmonkSubscriptionInput = {
  email: string;
  name?: string;
};

export class ListmonkError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ListmonkError";
    this.status = status;
  }
}

export function isListmonkConfigured(
  env: NodeJS.ProcessEnv = getEnvSource(),
): boolean {
  return Boolean(env.LISTMONK_URL?.trim() && env.LISTMONK_LIST_UUID?.trim());
}

function buildHeaders(env: NodeJS.ProcessEnv): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (
    env.LISTMONK_ACCESS_CLIENT_ID?.trim() &&
    env.LISTMONK_ACCESS_CLIENT_SECRET?.trim()
  ) {
    headers["CF-Access-Client-Id"] = env.LISTMONK_ACCESS_CLIENT_ID.trim();
    headers["CF-Access-Client-Secret"] =
      env.LISTMONK_ACCESS_CLIENT_SECRET.trim();
  }

  return headers;
}

/**
 * Create a pending subscription in Listmonk.
 *
 * Listmonk owns the double opt-in confirmation, unsubscribe page, and
 * per-subscriber state. The public API returns HTTP 200 with
 * `{data:{has_optin:true|false}}` (`true` means an opt-in mail was sent;
 * `false` means the address was already confirmed/blocked). Either is a
 * successful uniform acknowledgement; only malformed payloads fail.
 */
export async function subscribeToListmonk(
  input: ListmonkSubscriptionInput,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const env = getEnvSource();
  const baseUrl = env.LISTMONK_URL?.trim();
  const listUuid = env.LISTMONK_LIST_UUID?.trim();

  if (!baseUrl || !listUuid) {
    throw new ListmonkError(503, "Listmonk is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(
      new URL("/api/public/subscription", baseUrl).toString(),
      {
        method: "POST",
        headers: buildHeaders(env),
        body: JSON.stringify({
          email: input.email,
          name: input.name?.trim() || undefined,
          list_uuids: [listUuid],
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new ListmonkError(
        response.status,
        `Listmonk subscription failed with status ${response.status}`,
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new ListmonkError(502, "Listmonk returned a non-JSON response");
    }

    const payload = (await response.json()) as {
      data?: unknown;
      has_optin?: unknown;
    };
    const data = payload.data;
    const hasUniformAcknowledgement =
      data === true ||
      (typeof data === "object" && data !== null) ||
      payload.has_optin === true ||
      payload.has_optin === false;

    if (!hasUniformAcknowledgement) {
      throw new ListmonkError(502, "Listmonk did not acknowledge the request");
    }
  } catch (error) {
    if (error instanceof ListmonkError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new ListmonkError(504, "Listmonk request timed out");
    }

    throw new ListmonkError(
      502,
      error instanceof Error ? error.message : "Listmonk request failed",
    );
  } finally {
    clearTimeout(timeout);
  }
}
