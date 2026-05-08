import { z } from "zod";

export const headerSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().optional(),
});

export const tlsClientConfigSchema = z
  .object({
    clientCertPem: z.string().default(""),
    clientKeyPem: z.string().default(""),
    caCertPem: z.string().default(""),
    serverName: z.string().default(""),
  })
  .optional();
