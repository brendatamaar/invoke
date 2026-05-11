import type { AuthConfig } from "./types/auth";
import type { KeyValue } from "./types/common";
import type { HistoryEntry } from "./types/response";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "proxy-authorization",
  "x-auth-token",
]);

const REDACTED = "[redacted]";

function redactHeaders(headers: KeyValue[]): KeyValue[] {
  return headers.map((h) =>
    SENSITIVE_HEADERS.has(h.key.toLowerCase()) ? { ...h, value: REDACTED } : h,
  );
}

function redactAuth(auth: AuthConfig): AuthConfig {
  return {
    ...auth,
    password: auth.password ? REDACTED : auth.password,
    token: auth.token ? REDACTED : auth.token,
    clientSecret: auth.clientSecret ? REDACTED : auth.clientSecret,
    awsSecretAccessKey: auth.awsSecretAccessKey
      ? REDACTED
      : auth.awsSecretAccessKey,
    accessToken: auth.accessToken ? REDACTED : auth.accessToken,
    refreshToken: auth.refreshToken ? REDACTED : auth.refreshToken,
    apiKeyValue: auth.apiKeyValue ? REDACTED : auth.apiKeyValue,
  };
}

export function redactHistoryEntry(entry: HistoryEntry): HistoryEntry {
  const req = entry.request as any;
  const redactedRequest = {
    ...req,
    ...(req.headers ? { headers: redactHeaders(req.headers) } : {}),
    ...(req.auth ? { auth: redactAuth(req.auth) } : {}),
  };

  const response = entry.response;
  const redactedResponse = response
    ? {
        ...response,
        headers: response.headers ? redactHeaders(response.headers) : response.headers,
      }
    : response;

  return { ...entry, request: redactedRequest, response: redactedResponse };
}
