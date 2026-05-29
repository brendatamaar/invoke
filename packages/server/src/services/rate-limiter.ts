import { Clock, Context, Effect, Layer, Ref } from "effect";
import { RateLimitedError } from "../errors.js";

export interface RateLimitConfig {
  readonly maxTokens: number;
  readonly refillRate: number;
}

interface Bucket {
  readonly tokens: number;
  readonly last: number;
}

type CheckResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterMs: number };

export class RateLimiter extends Context.Tag("RateLimiter")<
  RateLimiter,
  {
    readonly check: (key: string, config: RateLimitConfig) => Effect.Effect<void, RateLimitedError>;
  }
>() {}

export const RateLimiterLive = Layer.effect(
  RateLimiter,
  Effect.gen(function* () {
    const buckets = yield* Ref.make(new Map<string, Bucket>());

    return {
      check: (key, config) =>
        Effect.gen(function* () {
          const now = (yield* Clock.currentTimeMillis) / 1000;
          const result = yield* Ref.modify(
            buckets,
            (current): [CheckResult, Map<string, Bucket>] => {
              const next = new Map(current);
              const existing = next.get(key);
              const refilled: Bucket = existing
                ? {
                    tokens: Math.min(
                      config.maxTokens,
                      existing.tokens + (now - existing.last) * config.refillRate,
                    ),
                    last: now,
                  }
                : { tokens: config.maxTokens, last: now };

              if (refilled.tokens < 1) {
                next.set(key, refilled);
                const retryAfterMs = Math.ceil(((1 - refilled.tokens) / config.refillRate) * 1000);
                return [{ allowed: false as const, retryAfterMs }, next];
              }

              next.set(key, {
                ...refilled,
                tokens: refilled.tokens - 1,
              });
              return [{ allowed: true as const }, next];
            },
          );

          if (!result.allowed) {
            return yield* Effect.fail(new RateLimitedError({ retryAfterMs: result.retryAfterMs }));
          }
        }),
    };
  }),
);
