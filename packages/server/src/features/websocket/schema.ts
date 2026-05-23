import { Schema } from "effect"
import { headerSchema, tlsClientConfigSchema } from "../shared/schema.js"

export const webSocketConnectSchema = Schema.Struct({
  url: Schema.String.pipe(Schema.minLength(1)),
  headers: Schema.optionalWith(Schema.Array(headerSchema), { default: () => [] }),
  protocols: Schema.optionalWith(Schema.Array(Schema.String), { default: () => [] }),
  timeoutMs: Schema.optionalWith(Schema.Number, { default: () => 30000 }),
  verifySsl: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  tlsClientConfig: tlsClientConfigSchema,
})

export const webSocketSendSchema = Schema.Struct({
  connectionId: Schema.String.pipe(Schema.minLength(1)),
  body: Schema.optionalWith(Schema.String, { default: () => "" }),
  binary: Schema.optionalWith(Schema.Boolean, { default: () => false }),
})

export const webSocketPollSchema = Schema.Struct({
  connectionId: Schema.String.pipe(Schema.minLength(1)),
  maxMessages: Schema.optionalWith(Schema.Number, { default: () => 100 }),
})

export const webSocketCloseSchema = Schema.Struct({
  connectionId: Schema.String.pipe(Schema.minLength(1)),
})
