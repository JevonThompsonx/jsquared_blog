/**
 * Thin helper for using Zod schemas in Hono route handlers.
 *
 * Usage:
 *   const body = await parseJson(c, mySchema);
 *   if (!body.ok) return body.response;
 *   // body.data is fully typed
 */
import type { Context } from "hono";
import type { ZodSchema, ZodError } from "zod";

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

/** Parse and validate a JSON request body. Returns typed data or a 400 Response. */
export async function parseJson<T>(
  c: Context,
  schema: ZodSchema<T>
): Promise<ParseResult<T>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return {
      ok: false,
      response: c.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON body" } }, 400) as unknown as Response,
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: formatZodError(c, result.error),
    };
  }

  return { ok: true, data: result.data };
}

/** Parse and validate query parameters (all come in as strings). */
export function parseQuery<T>(
  c: Context,
  schema: ZodSchema<T>
): ParseResult<T> {
  const raw = Object.fromEntries(
    new URL(c.req.url).searchParams.entries()
  );

  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      response: formatZodError(c, result.error),
    };
  }

  return { ok: true, data: result.data };
}

function formatZodError(c: Context, error: ZodError): Response {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[]>;
  return c.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: fieldErrors,
      },
    },
    400
  ) as unknown as Response;
}
