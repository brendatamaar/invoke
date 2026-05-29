# @invoke/server

The invoke control-plane HTTP API. It runs on Bun with
`@effect/platform` HttpApi, `HttpRouter`, and `@effect/platform-bun`.

## Run

```bash
pnpm --filter @invoke/server dev
pnpm --filter @invoke/server build
pnpm --filter @invoke/server start
```

The default port is `4000`. Override it with `PORT`.

## HTTP Surfaces

The server has two Effect HTTP surfaces in one `ServerLive` layer:

- `InvokeApi` in `src/api/index.ts`: 42 typed HttpApi operations across
  the health, execute, proxy, OAuth2, mock, mock gRPC, webhook,
  WebSocket, and gRPC groups.
- `RawRouter` in `src/api/raw-router.ts`: dynamic routes whose response
  shape is not fixed: `ALL /mock/*`, `ALL /webhook/:id`,
  `GET /api/oauth2/callback`, plus `/api/openapi.json` and `/api/docs`.

Discovery endpoints:

- `GET /api/openapi.json`: OpenAPI 3.1 document for the typed API.
- `GET /api/docs`: Scalar UI backed by `/api/openapi.json`.

## Layer Hierarchy

```text
ServerLive
|-- BunHttpServer.layer({ port })
|-- BunFileSystem.layer
|-- BunPath.layer
`-- HttpApiBuilder.serve(withRawRoutes)
    |-- ApiBuilderLayer
    |   `-- HandlersLayer
    |       |-- HealthLive
    |       |-- ExecuteLive
    |       |-- ProxyLive
    |       |-- OAuth2Live
    |       |-- MockLive
    |       |-- MockGrpcLive
    |       |-- MockGrpcRecordLive
    |       |-- WebhookLive
    |       |-- WebSocketLive
    |       `-- GrpcLive
    |-- ServicesLayer
    |   |-- GrpcExecutorLive
    |   |-- ProxyRecordStoreLive
    |   |-- MockStoreLive
    |   |-- MockGrpcStoreLive
    |   |-- MockGrpcRecorderLive
    |   |-- OAuth2StoreLive
    |   |-- WebhookStoreLive
    |   |-- RateLimiterLive
    |   `-- SsrfGuardLive
    `-- Middleware
        |-- CorsHttpMiddlewareLive
        |-- RequestLoggerLive
        |-- RateLimitExecuteLive
        |-- RateLimitWsConnectLive
        `-- RateLimitGrpcLive
```

`withRawRoutes` tries `RawRouter` first. If the raw router returns
`RouteNotFound`, the request falls through to the typed HttpApi app.

## Middleware Order

- CORS applies at the HttpApi server layer.
- Request logging wraps the typed API and records method, URL, status,
  and latency.
- Rate limits are group-specific HttpApi middleware:
  `RateLimitExecute`, `RateLimitWsConnect`, and `RateLimitGrpc`.
- SSRF checks are service calls in handlers that accept user-controlled
  network targets.
- Schema validation is built into HttpApi endpoint payload decoding.

## Errors

Shared typed errors live in `src/errors.ts`. HttpApi maps tagged errors to
HTTP status via `addError(...)` declarations on each endpoint.

| Error                  | Status | Surface                                                     | Used For                                                                             |
| ---------------------- | -----: | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `RateLimitedError`     |    429 | `addError` on execute / grpc / websocket groups             | Per-group token bucket exhaustion                                                    |
| `GrpcCallError`        |    502 | `addError` on health / execute / grpc / websocket endpoints | Unary executor call failure                                                          |
| `FixtureNotFoundError` |    404 | `addError` on mock-grpc-record endpoints                    | Unknown fixture id on get / delete / replay                                          |
| `GrpcStreamError`      |      — | Stream error channel only                                   | Streaming executor failure; closes the SSE stream, no HTTP status remap              |
| `SsrfBlockedError`     |    403 | Returned inline as JSON via `HttpServerResponse.unsafeJson` | Private or unsupported outbound target — `SsrfGuard` raises, the handler renders 403 |

HttpApi also returns 400 for schema decode failures (built-in, no
declaration needed). Anything else surfaces as 500 with the default
HttpApi error body.

## Streaming

The server exposes two SSE patterns:

- True server-stream relays: `POST /api/execute/stream` and
  `POST /api/grpc/server-stream` map executor streams to SSE frames.
- Polling-loop relays: `GET /api/grpc/stream/events` and
  `GET /api/websocket/events` poll executor state and emit SSE events
  until the connection closes.

## Tests

```bash
pnpm --filter @invoke/server test
```

Route tests live in `src/__tests__`. They use the typed
`HttpApiClient.makeWith(InvokeApi)` client against an in-memory fetch
adapter, plus `RawRouter` for catch-all routes. Each test gets fresh
Effect service layers and a stubbed `GrpcExecutor`.

`@effect/vitest` is installed for the intended runner, but this version
combination currently fails during suite collection. The working test
harness uses Vitest with `Effect.runPromise(Effect.scoped(...))` until
that upstream issue is resolved.
