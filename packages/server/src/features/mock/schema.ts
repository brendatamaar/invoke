import { validateMockRoutes } from "@invoke/core";
import type { MockRoute } from "@invoke/core";
import { Schema } from "effect";

const mockHeaderSchema = Schema.Struct({
  key: Schema.String,
  value: Schema.String,
  enabled: Schema.optional(Schema.Boolean),
});

const matcherSchema = Schema.Literal(
  "equals",
  "notEquals",
  "exists",
  "gt",
  "lt",
  "contains",
  "matches",
);

const mockConditionSchema = Schema.Struct({
  source: Schema.Literal("header", "query", "bodyJsonPath"),
  expression: Schema.String,
  matcher: Schema.optionalWith(matcherSchema, {
    default: () => "equals" as const,
  }),
  expected: Schema.optionalWith(Schema.String, { default: () => "" }),
});

const mockSequenceItemSchema = Schema.Struct({
  status: Schema.Number,
  headers: Schema.optionalWith(Schema.Array(mockHeaderSchema), {
    default: () => [],
  }),
  body: Schema.optionalWith(Schema.String, { default: () => "" }),
  latencyMs: Schema.optional(Schema.Number),
});

const mockRouteSchema = Schema.Struct({
  id: Schema.String,
  enabled: Schema.optional(Schema.Boolean),
  method: Schema.Literal("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"),
  pathPattern: Schema.String.pipe(Schema.minLength(1)),
  status: Schema.Number,
  headers: Schema.optionalWith(Schema.Array(mockHeaderSchema), {
    default: () => [],
  }),
  body: Schema.optionalWith(Schema.String, { default: () => "" }),
  latencyMs: Schema.optional(Schema.Number),
  conditions: Schema.optional(Schema.Array(mockConditionSchema)),
  sequences: Schema.optional(Schema.Array(mockSequenceItemSchema)),
});

export const mockRoutesSchema = Schema.Struct({
  routes: Schema.Array(mockRouteSchema),
}).pipe(
  Schema.filter((input) => {
    const validation = validateMockRoutes(input.routes as unknown as MockRoute[]);
    if (validation.errors.length > 0) return validation.errors[0].message;
    return true;
  }),
);

export const mockGrpcRouteSchema = Schema.Struct({
  fullMethod: Schema.String.pipe(Schema.minLength(1)),
  responses: Schema.Array(
    Schema.Struct({
      bodyJson: Schema.optionalWith(Schema.String, { default: () => "{}" }),
      statusCode: Schema.optionalWith(Schema.Number, { default: () => 0 }),
      statusMessage: Schema.optionalWith(Schema.String, { default: () => "" }),
      trailers: Schema.optionalWith(
        Schema.Array(Schema.Struct({ key: Schema.String, value: Schema.String })),
        { default: () => [] },
      ),
    }),
  ).pipe(Schema.minItems(1)),
  latencyMs: Schema.optional(Schema.Number),
  enabled: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});

export const mockGrpcRoutesSchema = Schema.Struct({
  routes: Schema.Array(mockGrpcRouteSchema),
});

export const mockGrpcCallSchema = Schema.Struct({
  fullMethod: Schema.String.pipe(Schema.minLength(1)),
  bodyJson: Schema.optionalWith(Schema.String, { default: () => "{}" }),
});

export const startRecordingSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1)),
  address: Schema.String.pipe(Schema.minLength(1)),
});
