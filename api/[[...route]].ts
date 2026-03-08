import { handle } from "hono/vercel";
import { Hono } from "hono";
import { app } from "../server/src/index";

export const runtime = "nodejs";

const apiApp = new Hono().route("/api", app);

export const GET = handle(apiApp);
export const POST = handle(apiApp);
export const PUT = handle(apiApp);
export const DELETE = handle(apiApp);
export const OPTIONS = handle(apiApp);
