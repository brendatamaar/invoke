import { Schema } from "effect";

const proxyHeaderSchema = Schema.Struct({
  key: Schema.String,
  value: Schema.String,
  enabled: Schema.optional(Schema.Boolean),
});

export const proxySchema = Schema.Struct({
  targetUrl: Schema.String.pipe(Schema.minLength(1)),
  method: Schema.optionalWith(Schema.String, { default: () => "GET" }),
  headers: Schema.optionalWith(Schema.Array(proxyHeaderSchema), { default: () => [] }),
  body: Schema.optionalWith(Schema.String, { default: () => "" }),
});

export const proxyRecordsToMocksSchema = Schema.Struct({
  ids: Schema.optional(Schema.Array(Schema.String)),
});
