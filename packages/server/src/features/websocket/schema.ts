import { z } from "zod";
import { headerSchema, tlsClientConfigSchema } from "../shared/schema.js";

export const webSocketConnectSchema = z.object({
  url: z.string().min(1),
  headers: z.array(headerSchema).default([]),
  protocols: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().default(30000),
  verifySsl: z.boolean().default(true),
  tlsClientConfig: tlsClientConfigSchema,
});

export const webSocketSendSchema = z.object({
  connectionId: z.string().min(1),
  body: z.string().default(""),
  binary: z.boolean().default(false),
});

export const webSocketPollSchema = z.object({
  connectionId: z.string().min(1),
  maxMessages: z.number().int().min(1).max(100).default(100),
});

export const webSocketCloseSchema = z.object({
  connectionId: z.string().min(1),
});
