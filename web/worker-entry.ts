/**
 * Cloudflare Worker entry shim.
 *
 * vinext's fetch handler and the app both read `process.env` at module load.
 * On Workers with `nodejs_compat` the runtime normally populates it, but the
 * vinext/Cloudflare build does not do so reliably for the RSC environment.
 * Copy string bindings/secrets into `process.env` *before* dynamically
 * importing the handler, so `env.ts` sees them.
 */
type WorkerEnv = Record<string, unknown>;

let handlerPromise: Promise<any> | null = null;

function loadHandler(): Promise<any> {
  if (!handlerPromise) {
    handlerPromise = import("vinext/server/fetch-handler");
  }
  return handlerPromise;
}

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: unknown,
  ): Promise<Response> {
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") {
        (process.env as Record<string, string>)[key] = value;
      }
    }

    const mod: any = await loadHandler();
    const handler: any = mod.default ?? mod;

    if (typeof handler === "function") {
      return handler(request, env, ctx);
    }
    return handler.fetch(request, env, ctx);
  },
};
