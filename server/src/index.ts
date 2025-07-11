import { Hono } from "hono";
import { cors } from "hono/cors";
import { ApiResponse } from "@shared/index";

export const app = new Hono()

  .use(cors())

  .get("/", (c) => {
    return c.text("Hello Hono!");
  })

  .get("/hello", async (c) => {
    const data: ApiResponse = {
      message: "Hello BHVR!",
      success: true,
    };

    return c.json(data, { status: 200 });
  });

export default app;

