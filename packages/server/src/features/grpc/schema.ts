import { Schema } from "effect"
import { headerSchema, tlsClientConfigSchema } from "../shared/schema.js"

const grpcAuthSchema = Schema.optional(
  Schema.Struct({
    type: Schema.optionalWith(Schema.String, { default: () => "none" }),
    username: Schema.optional(Schema.String),
    password: Schema.optional(Schema.String),
    token: Schema.optional(Schema.String),
    apiKeyName: Schema.optional(Schema.String),
    apiKeyValue: Schema.optional(Schema.String),
    apiKeyIn: Schema.optional(Schema.Literal("header", "query")),
    accessToken: Schema.optional(Schema.String),
  }),
)

export const grpcReflectSchema = Schema.Struct({
  address: Schema.String.pipe(Schema.minLength(1)),
  tls: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  timeoutMs: Schema.optionalWith(Schema.Number, { default: () => 30000 }),
  metadata: Schema.optionalWith(Schema.Array(headerSchema), { default: () => [] }),
  verifySsl: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  tlsClientConfig: tlsClientConfigSchema,
  auth: grpcAuthSchema,
  protosetBase64: Schema.optional(Schema.String),
})

export const grpcExecuteSchema = Schema.Struct({
  ...grpcReflectSchema.fields,
  fullMethod: Schema.String.pipe(Schema.minLength(1)),
  bodyJson: Schema.optionalWith(Schema.String, { default: () => "{}" }),
  compression: Schema.optional(Schema.Literal("none", "gzip")),
})
