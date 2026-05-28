import { expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { RateLimiter, RateLimiterLive } from "./rate-limiter.js";

const freshLayer = Layer.fresh(RateLimiterLive);

it("allows requests within the burst", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const limiter = yield* RateLimiter;
      const config = { maxTokens: 2, refillRate: 1 };
      yield* limiter.check("client-a", config);
      yield* limiter.check("client-a", config);
    }).pipe(Effect.provide(freshLayer)),
  );
});

it("blocks after the burst is exhausted", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const limiter = yield* RateLimiter;
      const config = { maxTokens: 2, refillRate: 1 };
      yield* limiter.check("client-b", config);
      yield* limiter.check("client-b", config);

      const result = yield* Effect.either(limiter.check("client-b", config));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("RateLimitedError");
        expect(result.left.retryAfterMs).toBeGreaterThan(0);
      }
    }).pipe(Effect.provide(freshLayer)),
  );
});

it("tracks clients independently", async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const limiter = yield* RateLimiter;
      const config = { maxTokens: 1, refillRate: 1 };
      yield* limiter.check("client-c", config);
      yield* limiter.check("client-d", config);

      const blocked = yield* Effect.either(limiter.check("client-c", config));
      expect(blocked._tag).toBe("Left");
    }).pipe(Effect.provide(freshLayer)),
  );
});
