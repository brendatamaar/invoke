import { z } from "zod";
import { headerSchema, tlsClientConfigSchema } from "../shared/schema.js";

const grpcAuthSchema = z
  .object({
    type: z.string().default("none"),
    username: z.string().optional(),
    password: z.string().optional(),
    token: z.string().optional(),
    apiKeyName: z.string().optional(),
    apiKeyValue: z.string().optional(),
    apiKeyIn: z.enum(["header", "query"]).optional(),
    accessToken: z.string().optional(),
  })
  .optional();

export const grpcReflectSchema = z.object({
  address: z.string().min(1),
  tls: z.boolean().default(true),
  timeoutMs: z.number().int().positive().default(30000),
  metadata: z.array(headerSchema).default([]),
  verifySsl: z.boolean().default(true),
  tlsClientConfig: tlsClientConfigSchema,
  auth: grpcAuthSchema,
  protosetBase64: z.string().optional(),
});

export const grpcExecuteSchema = grpcReflectSchema.extend({
  fullMethod: z.string().min(1),
  bodyJson: z.string().default("{}"),
  compression: z.enum(["none", "gzip"]).optional(),
});
