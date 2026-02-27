import { hc } from "hono/client";
// Import the named Hono app instance (not the default Worker export) for correct type inference.
import type { app } from "./index";

export type AppType = typeof app;
export type Client = ReturnType<typeof hc<AppType>>;

export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<AppType>(...args);

