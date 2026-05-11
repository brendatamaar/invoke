import type { AuthConfig } from "@invoke/core";

export async function oauth2AuthCodeStart(params: {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  redirectUri: string;
  pkce: boolean;
  codeChallenge: string;
  codeChallengeMethod: string;
  codeVerifier: string;
}): Promise<{ authUrl: string; state: string }> {
  const response = await fetch("/api/oauth2/auth-code/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<{ authUrl: string; state: string }>;
}

export async function oauth2AuthCodeResult(state: string): Promise<{
  status: "pending" | "done" | "error" | "unknown";
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  error?: string;
}> {
  const response = await fetch(`/api/oauth2/auth-code/result/${state}`);
  return response.json() as Promise<{
    status: "pending" | "done" | "error" | "unknown";
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresIn?: number;
    error?: string;
  }>;
}

export async function oauth2ClientCredentials(auth: AuthConfig): Promise<{
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  error?: string;
}> {
  const response = await fetch("/api/oauth2/client-credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tokenUrl: auth.tokenUrl,
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
      scope: auth.scope,
    }),
  });
  const payload = (await response.json()) as {
    accessToken?: string;
    tokenType?: string;
    expiresIn?: number;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
}

export async function oauth2RefreshToken(params: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
}> {
  const response = await fetch("/api/oauth2/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const payload = (await response.json()) as {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error || response.statusText);
  return payload;
}
