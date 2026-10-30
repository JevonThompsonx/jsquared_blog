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
    return invoke(request, env, ctx);
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
