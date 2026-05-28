import { Either, Schema } from "effect";
import type { Context } from "hono";

export async function parseJsonBody<A, I>(
  c: Context,
  schema: Schema.Schema<A, I>,
): Promise<{ ok: true; data: A } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, response: c.json({ error: "invalid JSON body" }, 400) };
  }
  const result = Schema.decodeUnknownEither(schema)(raw);
  if (Either.isLeft(result)) {
    return { ok: false, response: c.json({ error: "validation failed" }, 422) };
  }
  return { ok: true, data: result.right };
}
