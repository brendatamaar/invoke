import { HttpApiMiddleware, HttpServerRequest } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { RateLimitedError } from "../errors.js";
import { RateLimiter, type RateLimitConfig } from "../services/rate-limiter.js";

const clientKey = (headers: Record<string, string>) =>
  headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? headers["x-real-ip"] ?? "unknown";

const middlewareEffect = (
  limiter: Context.Tag.Service<typeof RateLimiter>,
  config: RateLimitConfig,
) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    yield* limiter.check(clientKey(request.headers as Record<string, string>), config);
  });

export class RateLimitExecute extends HttpApiMiddleware.Tag<RateLimitExecute>()(
  "RateLimitExecute",
  { failure: RateLimitedError },
) {}

export const RateLimitExecuteLive = Layer.effect(
  RateLimitExecute,
  Effect.map(RateLimiter, (limiter) => middlewareEffect(limiter, { maxTokens: 60, refillRate: 1 })),
);

export class RateLimitWsConnect extends HttpApiMiddleware.Tag<RateLimitWsConnect>()(
  "RateLimitWsConnect",
  { failure: RateLimitedError },
) {}

export const RateLimitWsConnectLive = Layer.effect(
  RateLimitWsConnect,
  Effect.map(RateLimiter, (limiter) => middlewareEffect(limiter, { maxTokens: 20, refillRate: 2 })),
);

export class RateLimitGrpc extends HttpApiMiddleware.Tag<RateLimitGrpc>()("RateLimitGrpc", {
  failure: RateLimitedError,
}) {}

export const RateLimitGrpcLive = Layer.effect(
  RateLimitGrpc,
  Effect.map(RateLimiter, (limiter) => middlewareEffect(limiter, { maxTokens: 40, refillRate: 2 })),
);
