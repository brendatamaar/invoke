import { Schema } from "effect"
import { headerSchema, tlsClientConfigSchema } from "../shared/schema.js"

export const executeSchema = Schema.Struct({
  method: Schema.optionalWith(Schema.String, { default: () => "GET" }),
  url: Schema.String.pipe(Schema.minLength(1)),
  headers: Schema.optionalWith(Schema.Array(headerSchema), { default: () => [] }),
  body: Schema.optionalWith(Schema.String, { default: () => "" }),
  bodyMode: Schema.optional(
    Schema.Literal("none", "json", "form-data", "urlencoded", "raw", "file", "graphql-multipart"),
  ),
  auth: Schema.optional(
    Schema.Struct({
      type: Schema.optionalWith(Schema.String, { default: () => "none" }),
      username: Schema.optional(Schema.String),
      password: Schema.optional(Schema.String),
      token: Schema.optional(Schema.String),
      apiKeyName: Schema.optional(Schema.String),
      apiKeyValue: Schema.optional(Schema.String),
      apiKeyIn: Schema.optional(Schema.Literal("header", "query")),
      ntlmUsername: Schema.optional(Schema.String),
      ntlmPassword: Schema.optional(Schema.String),
      ntlmDomain: Schema.optional(Schema.String),
    }),
  ),
  timeoutMs: Schema.optionalWith(Schema.Number, { default: () => 30000 }),
  connectTimeoutMs: Schema.optional(Schema.Number),
  readTimeoutMs: Schema.optional(Schema.Number),
  followRedirects: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  maxRedirects: Schema.optionalWith(Schema.Number, { default: () => 10 }),
  verifySsl: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  allowPrivateAddresses: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  proxy: Schema.optional(
    Schema.Struct({
      type: Schema.optionalWith(Schema.Literal("http", "socks5"), { default: () => "http" as const }),
      url: Schema.optionalWith(Schema.String, { default: () => "" }),
      username: Schema.optionalWith(Schema.String, { default: () => "" }),
      password: Schema.optionalWith(Schema.String, { default: () => "" }),
    }),
  ),
  tlsClientConfig: tlsClientConfigSchema,
})
