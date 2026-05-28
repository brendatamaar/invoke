import { Schema } from "effect";

export const webhookValidationSchema = Schema.Struct({
  type: Schema.Literal("none", "hmac", "header"),
  secret: Schema.optional(Schema.String),
  algorithm: Schema.optional(Schema.Literal("sha256", "sha1", "sha512")),
  signatureHeader: Schema.optional(Schema.String),
  signaturePrefix: Schema.optional(Schema.String),
  headerName: Schema.optional(Schema.String),
  headerValue: Schema.optional(Schema.String),
});
