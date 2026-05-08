import { z } from "zod";
import { headerSchema, tlsClientConfigSchema } from "../shared/schema.js";

export const executeSchema = z.object({
  method: z.string().default("GET"),
  url: z.string().min(1),
  headers: z.array(headerSchema).default([]),
  body: z.string().default(""),
  auth: z
    .object({
      type: z.string().default("none"),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
  timeoutMs: z.number().int().positive().default(30000),
  followRedirects: z.boolean().default(true),
  maxRedirects: z.number().int().default(10),
  verifySsl: z.boolean().default(true),
  proxy: z
    .object({
      type: z.enum(["http", "socks5"]).default("http"),
      url: z.string().default(""),
      username: z.string().default(""),
      password: z.string().default(""),
    })
    .optional(),
  tlsClientConfig: tlsClientConfigSchema,
});
