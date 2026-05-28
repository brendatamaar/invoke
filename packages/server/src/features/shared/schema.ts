import { Schema } from "effect";

export const headerSchema = Schema.Struct({
  key: Schema.String,
  value: Schema.String,
  enabled: Schema.optional(Schema.Boolean),
});

export const tlsClientConfigSchema = Schema.optional(
  Schema.Struct({
    clientCertPem: Schema.optionalWith(Schema.String, { default: () => "" }),
    clientKeyPem: Schema.optionalWith(Schema.String, { default: () => "" }),
    caCertPem: Schema.optionalWith(Schema.String, { default: () => "" }),
    serverName: Schema.optionalWith(Schema.String, { default: () => "" }),
  }),
);
