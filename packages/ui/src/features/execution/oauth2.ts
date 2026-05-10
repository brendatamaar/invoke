import type { RequestConfig } from "@invoke/core";
import { oauth2ClientCredentials } from "../oauth2/api";

export async function applyOAuth2Token(
  request: RequestConfig,
  warn: (message: string) => void,
): Promise<RequestConfig> {
  if (request.auth?.type !== "oauth2") return request;

  const flow = request.auth.flow ?? "client_credentials";
  if (flow === "authorization_code" && request.auth.accessToken) {
    if (request.auth.tokenExpiresAt && request.auth.tokenExpiresAt < Date.now()) {
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
