import { z } from "zod";

export const oauth2ClientCredentialsSchema = z.object({
  tokenUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().default(""),
  scope: z.string().default(""),
});

export const oauth2AuthCodeStartSchema = z.object({
  authUrl: z.string().url(),
  tokenUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().default(""),
  scope: z.string().default(""),
  redirectUri: z.string().url(),
  pkce: z.boolean().default(false),
  codeChallenge: z.string().default(""),
  codeChallengeMethod: z.string().default(""),
});
