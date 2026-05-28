import { HttpApiBuilder, HttpServerRequest } from "@effect/platform";
import { Clock, Effect } from "effect";
import { logger } from "../logger.js";

export const RequestLoggerLive = HttpApiBuilder.middleware((httpApp) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const start = yield* Clock.currentTimeMillis;
    logger.info({ method: request.method, url: request.url }, "request");
    const response = yield* httpApp;
    const end = yield* Clock.currentTimeMillis;
    logger.info(
      {
        method: request.method,
        url: request.url,
        status: response.status,
        durationMs: end - start,
      },
      "request complete",
    );
    return response;
  }),
);
