import { HttpApiBuilder, HttpServerRequest } from "@effect/platform";
import { Clock, Effect } from "effect";
import { logger } from "../logger.js";

const SENSITIVE_PARAMS = new Set([
  "api_key", "apikey", "token", "access_token", "refresh_token",
  "secret", "password", "client_secret", "auth", "authorization",
  "key", "signature", "sig",
]);

function safePath(url: string): string {
  try {
    const parsed = new URL(url, "http://localhost");
    const params = new URLSearchParams();
    for (const [k, v] of parsed.searchParams) {
      params.set(k, SENSITIVE_PARAMS.has(k.toLowerCase()) ? "[redacted]" : v);
    }
    const qs = params.toString();
    return qs ? `${parsed.pathname}?${qs}` : parsed.pathname;
  } catch {
    return url.split("?")[0];
  }
}

export const RequestLoggerLive = HttpApiBuilder.middleware((httpApp) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const start = yield* Clock.currentTimeMillis;
    const path = safePath(request.url);
    logger.info({ method: request.method, path }, "request");
    const response = yield* httpApp;
    const end = yield* Clock.currentTimeMillis;
    logger.info(
      {
        method: request.method,
        path,
        status: response.status,
        durationMs: end - start,
      },
      "request complete",
    );
    return response;
  }),
);
