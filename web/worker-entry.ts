/**
 * Cloudflare Worker entry.
 *
 * Two jobs:
 *
 * 1. **Configuration bridge.** vinext's fetch handler and the app read
 *    configuration at module-eval time. On Workers `process.env` is a frozen
 *    proxy populated with plain vars only — Worker *secrets* never reach it and
 *    assignments to it are silently ignored. So publish the binding set on
 *    `globalThis.__RUNTIME_ENV__` before importing the handler; `src/lib/env.ts`
 *    merges that object over `process.env`.
 *
 * 2. **Cron Triggers.** `vercel.json` crons have no equivalent on Workers, so
 *    the schedules registered on the Worker are mapped to the app's cron routes
 *    here and called with the `CRON_SECRET` bearer token the routes expect.
 *
 * Diagnostics log binding *names* and value *lengths* only — never values.
 */
type WorkerEnv = Record<string, unknown>;

const CRON_ROUTES: Record<string, string> = {
  "0 0 * * *": "/api/cron/publish-scheduled",
  "0 6 * * *": "/api/cron/keep-supabase-awake",
};

let handlerPromise: Promise<any> | null = null;
let runtime: Record<string, string> | null = null;
let published = false;

const CRAWLER_UA_PATTERN =
  /googlebot|bingbot|bingpreview|duckduckbot|slurp|yandexbot|baiduspider|facebookexternalhit|twitterbot|linkedinbot|applebot|ahrefsbot|semrushbot|gptbot|claudebot|ccbot|perplexitybot/i;

const NOT_FOUND_BODY_MARKERS = [
  "NEXT_HTTP_ERROR_FALLBACK;404",
  "NEXT_NOT_FOUND",
] as const;

/**
 * Vinext streams the shell, so a notFound() raised after the first byte keeps
 * HTTP 200 even though the rendered body is the not-found page. Crawlers need
 * the real status to drop soft-404 URLs from the index. Only bot HTML requests
 * are buffered here; human traffic keeps streaming.
 */
export async function normalizeCrawlerNotFound(
  request: Request,
  response: Response,
): Promise<Response> {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (response.status !== 200 || !CRAWLER_UA_PATTERN.test(userAgent)) {
    return response;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return response;
  }

  const body = await response.text();
  const isNotFound = NOT_FOUND_BODY_MARKERS.some((marker) =>
    body.includes(marker),
  );

  if (!isNotFound) {
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  // The body has already been decoded by response.text().
  headers.delete("content-encoding");

  return new Response(body, {
    status: 404,
    statusText: "Not Found",
    headers,
  });
}

function loadHandler(): Promise<any> {
  if (!handlerPromise) {
    handlerPromise = import("vinext/server/fetch-handler");
  }
  return handlerPromise;
}

function publishEnv(env: WorkerEnv): Record<string, string> {
  if (published && runtime) return runtime;

  const strings: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") strings[key] = value;
  }

  runtime = strings;
  published = true;
  (
    globalThis as unknown as { __RUNTIME_ENV__?: Record<string, string> }
  ).__RUNTIME_ENV__ = strings;

  const names = Object.keys(strings)
    .filter((key) => key !== "ASSETS")
    .sort();
  console.log(`[entry] bindings(${names.length}): ${names.join(",")}`);
  console.log(
    `[entry] runtimeEnv tursoLen=${(strings.TURSO_DATABASE_URL ?? "").length} authLen=${(strings.AUTH_SECRET ?? "").length}`,
  );

  return strings;
}

async function invoke(
  request: Request,
  env: WorkerEnv,
  ctx: unknown,
): Promise<Response> {
  const mod: any = await loadHandler();
  const handler: any = mod.default ?? mod;

  if (typeof handler === "function") {
    return handler(request, env, ctx);
  }
  return handler.fetch(request, env, ctx);
}

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: unknown,
  ): Promise<Response> {
    publishEnv(env);
    const response = await invoke(request, env, ctx);
    return normalizeCrawlerNotFound(request, response);
  },

  async scheduled(
    event: { cron: string },
    env: WorkerEnv,
    ctx: any,
  ): Promise<void> {
    const strings = publishEnv(env);
    const path = CRON_ROUTES[event.cron];
    if (!path) {
      console.warn(`[cron] no route mapped for schedule "${event.cron}"`);
      return;
    }

    const request = new Request(`https://cron.internal${path}`, {
      method: "GET",
      headers: { authorization: `Bearer ${strings.CRON_SECRET ?? ""}` },
    });

    const run = (async () => {
      const response = await invoke(request, env, ctx);
      console.log(`[cron] ${event.cron} -> ${path} ${response.status}`);
    })();

    if (ctx?.waitUntil) ctx.waitUntil(run);
    await run;
  },
};
