#!/usr/bin/env node
/**
 * Idempotently register the blog's AuthKit callback URIs.
 *
 * This is an operator-only script. It requires WORKOS_API_KEY in the shell
 * environment; never add that key to the Node app environment.
 */

import { pathToFileURL } from "node:url";

export const WORKOS_CALLBACK_URIS = [
  "https://jsquaredadventures.com/callback",
  "https://www.jsquaredadventures.com/callback",
  "https://next.jsquaredadventures.com/callback",
  "http://localhost:3000/callback",
];

async function workosRequest(url, init, fetchImpl, action) {
  const response = await fetchImpl(url, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(
      `WorkOS redirect URI ${action} failed (${response.status})`,
    );
  }
  return response.json();
}

export async function syncWorkosRedirectUris({
  apiKey,
  apiHostname = "api.workos.com",
  fetchImpl = fetch,
}) {
  if (!apiKey?.trim()) {
    throw new Error("WORKOS_API_KEY is required for this operator-only script");
  }
  if (!/^[a-z0-9.-]+$/i.test(apiHostname)) {
    throw new Error("Invalid WORKOS_API_HOSTNAME");
  }

  const baseUrl = `https://${apiHostname}/user_management/redirect_uris`;
  const headers = {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
  };
  const list = await workosRequest(baseUrl, { headers }, fetchImpl, "list");
  if (!Array.isArray(list?.data)) {
    throw new Error("WorkOS redirect URI list returned an invalid response");
  }

  const existing = new Set(
    list.data
      .map((entry) => (typeof entry?.uri === "string" ? entry.uri : ""))
      .filter(Boolean),
  );
  let created = 0;
  const existingCount = existing.size;

  for (const uri of WORKOS_CALLBACK_URIS) {
    if (existing.has(uri)) continue;
    await workosRequest(
      baseUrl,
      { method: "POST", headers, body: JSON.stringify({ uri }) },
      fetchImpl,
      "create",
    );
    existing.add(uri);
    created += 1;
  }

  return { existing: existingCount, created };
}

async function main() {
  const result = await syncWorkosRedirectUris({
    apiKey: process.env.WORKOS_API_KEY,
    apiHostname: process.env.WORKOS_API_HOSTNAME,
  });
  console.info(
    `[workos] callbacks ready: ${result.existing} existing, ${result.created} created`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "WorkOS callback setup failed",
    );
    process.exitCode = 1;
  });
}
