import { z } from "zod";

export const proxySchema = z.object({
  targetUrl: z.string().url(),
  method: z.string().default("GET"),
  headers: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
        enabled: z.boolean().optional(),
      }),
    )
    .default([]),
  body: z.string().default(""),
});

export const proxyRecordsToMocksSchema = z.object({
  ids: z.array(z.string()).optional(),
});
