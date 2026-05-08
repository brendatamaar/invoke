import { z } from "zod";
import { headerSchema, tlsClientConfigSchema } from "../shared/schema.js";

export const grpcReflectSchema = z.object({
  address: z.string().min(1),
  tls: z.boolean().default(true),
  timeoutMs: z.number().int().positive().default(30000),
  metadata: z.array(headerSchema).default([]),
  verifySsl: z.boolean().default(true),
  tlsClientConfig: tlsClientConfigSchema,
});

export const grpcExecuteSchema = grpcReflectSchema.extend({
  fullMethod: z.string().min(1),
  bodyJson: z.string().default("{}"),
});
