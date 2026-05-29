import type { AuthConfig, RequestConfig } from "@invoke/core";
import { oauth2ClientCredentials, oauth2RefreshToken } from "../oauth2/api";

export async function applyOAuth2Token(
  request: RequestConfig,
  warn: (message: string) => void,
  onTokenUpdate?: (auth: AuthConfig) => void,
): Promise<RequestConfig> {
  if (request.auth?.type !== "oauth2") return request;

  const flow = request.auth.flow ?? "client_credentials";
  if (flow === "authorization_code" && request.auth.accessToken) {
    const isExpiring =
      request.auth.tokenExpiresAt !== undefined &&
      request.auth.tokenExpiresAt < Date.now() + 60_000;

    if (isExpiring && request.auth.refreshToken) {
      try {
        const refreshed = await oauth2RefreshToken({
          tokenUrl: request.auth.tokenUrl ?? "",
          clientId: request.auth.clientId ?? "",
          clientSecret: request.auth.clientSecret ?? "",
          refreshToken: request.auth.refreshToken,
        });
        if (refreshed.accessToken) {
          const newAuth: AuthConfig = {
            ...request.auth,
            accessToken: refreshed.accessToken,
            refreshToken: refreshed.refreshToken ?? request.auth.refreshToken,
            tokenExpiresAt: refreshed.expiresIn
              ? Date.now() + refreshed.expiresIn * 1000
              : undefined,
          };
          onTokenUpdate?.(newAuth);
          return {
            ...request,
            auth: { ...newAuth, type: "bearer", token: refreshed.accessToken },
          };
        }
      } catch {
        warn("OAuth2: refresh token exchange failed - re-authorize in the Auth tab");
      }
    } else if (isExpiring) {
      warn("OAuth2 token may be expired - re-authorize in the Auth tab");
    }

    return {
      ...request,
      auth: {
        ...request.auth,
        type: "bearer",
        token: request.auth.accessToken,
      },
    };
  }

  if (flow !== "client_credentials") return request;

  try {
    const token = await oauth2ClientCredentials(request.auth);
    if (!token.accessToken) return request;
    return {
      ...request,
      auth: { ...request.auth, type: "bearer", token: token.accessToken },
    };
  } catch (e) {
    warn(`OAuth2: ${e}`);
    return request;
  }
}
