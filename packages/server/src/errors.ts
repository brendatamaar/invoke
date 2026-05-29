import { Schema } from "effect";

export class GrpcCallError extends Schema.TaggedError<GrpcCallError>()("GrpcCallError", {
  method: Schema.String,
  cause: Schema.Unknown,
}) {}

export class GrpcStreamError extends Schema.TaggedError<GrpcStreamError>()("GrpcStreamError", {
  method: Schema.String,
  cause: Schema.Unknown,
}) {}

export class SsrfBlockedError extends Schema.TaggedError<SsrfBlockedError>()("SsrfBlockedError", {
  url: Schema.String,
  reason: Schema.String,
}) {}

export class RateLimitedError extends Schema.TaggedError<RateLimitedError>()("RateLimitedError", {
  retryAfterMs: Schema.Number,
}) {}

export class FixtureNotFoundError extends Schema.TaggedError<FixtureNotFoundError>()(
  "FixtureNotFoundError",
  {
    id: Schema.String,
  },
) {}
