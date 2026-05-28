import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import { openApiSpec } from "./openapi.js";
import { mockCatchAll } from "./raw/mock-catchall.js";
import { oauth2Callback } from "./raw/oauth2-callback.js";
import { webhookReceiver } from "./raw/webhook-receiver.js";

const openApiJson = JSON.stringify(openApiSpec);

const scalarHtml = `<!doctype html>
<html>
  <head>
    <title>invoke API - Scalar</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script id="api-reference" data-url="/api/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

export const RawRouter = HttpRouter.empty.pipe(
  HttpRouter.all("/mock/*", mockCatchAll),
  HttpRouter.all("/webhook/:id", webhookReceiver),
  HttpRouter.get("/api/oauth2/callback", oauth2Callback),
  HttpRouter.get(
    "/api/openapi.json",
    Effect.succeed(
      HttpServerResponse.text(openApiJson, {
        contentType: "application/json",
      }),
    ),
  ),
  HttpRouter.get(
    "/api/docs",
    Effect.succeed(
      HttpServerResponse.setHeader(
        HttpServerResponse.html(scalarHtml),
        "cache-control",
        "public, max-age=3600",
      ),
    ),
  ),
);
