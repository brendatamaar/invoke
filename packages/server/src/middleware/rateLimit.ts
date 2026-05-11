import type { MiddlewareHandler } from "hono";

interface Bucket {
  tokens: number;
  last: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Token bucket rate limiter.
 * @param maxTokens   burst capacity (default 60)
 * @param refillRate  tokens added per second (default 1 → 60 req/min steady-state)
 */
export function rateLimit(
  maxTokens = 60,
  refillRate = 1,
): MiddlewareHandler {
  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0].trim() ??
      c.req.header("x-real-ip") ??
      "unknown";

    const now = Date.now() / 1000;
    let bucket = buckets.get(ip);

    if (!bucket) {
      bucket = { tokens: maxTokens, last: now };
      buckets.set(ip, bucket);
    } else {
      const elapsed = now - bucket.last;
      bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
      bucket.last = now;
    }

    if (bucket.tokens < 1) {
      return c.json({ error: "Too many requests" }, 429);
    }

    bucket.tokens -= 1;
    await next();
  };
}
