import { HttpApiBuilder, HttpApp, HttpServerResponse } from "@effect/platform";
import { BunFileSystem, BunHttpServer, BunPath, BunRuntime } from "@effect/platform-bun";
import { Effect, Layer } from "effect";
import { ExecuteLive } from "./api/handlers/execute.js";
import { GrpcLive } from "./api/handlers/grpc.js";
import { HealthLive } from "./api/handlers/health.js";
import { MockLive } from "./api/handlers/mock.js";
import { MockGrpcLive } from "./api/handlers/mock-grpc.js";
import { MockGrpcRecordLive } from "./api/handlers/mock-grpc-record.js";
import { OAuth2Live } from "./api/handlers/oauth2.js";
import { ProxyLive } from "./api/handlers/proxy.js";
import { WebSocketLive } from "./api/handlers/websocket.js";
import { WebhookLive } from "./api/handlers/webhook.js";
import { InvokeApi } from "./api/index.js";
import { RawRouter } from "./api/raw-router.js";
import { CorsHttpMiddlewareLive } from "./middleware/cors.js";
import { RequestLoggerLive } from "./middleware/logger.js";
import {
  RateLimitExecuteLive,
  RateLimitGrpcLive,
  RateLimitWsConnectLive,
} from "./middleware/rate-limit.js";
import { GrpcExecutorLive } from "./services/grpc-executor.js";
import { MockGrpcRecorderLive } from "./services/mock-grpc-recorder.js";
import { MockGrpcStoreLive } from "./services/mock-grpc-store.js";
import { MockStoreLive, OAuth2StoreLive, WebhookStoreLive } from "./services/index.js";
import { ProxyRecordStoreLive } from "./services/proxy-record-store.js";
import { RateLimiterLive } from "./services/rate-limiter.js";
import { SsrfGuardLive } from "./services/ssrf-guard.js";

const port = Number(process.env.PORT ?? 4000);

const ServicesLayer = Layer.mergeAll(
  GrpcExecutorLive,
  ProxyRecordStoreLive,
  MockStoreLive,
  MockGrpcStoreLive,
  MockGrpcRecorderLive,
  OAuth2StoreLive,
  WebhookStoreLive,
  RateLimiterLive,
  SsrfGuardLive,
);

const MiddlewareLayer = Layer.mergeAll(
  RateLimitExecuteLive,
  RateLimitWsConnectLive,
  RateLimitGrpcLive,
).pipe(Layer.provide(ServicesLayer));

const HandlersLayer = Layer.mergeAll(
  HealthLive,
  ExecuteLive,
  ProxyLive,
  OAuth2Live,
  MockLive,
  MockGrpcLive,
  MockGrpcRecordLive,
  WebhookLive,
  WebSocketLive,
  GrpcLive,
).pipe(Layer.provide(Layer.mergeAll(ServicesLayer, MiddlewareLayer)));

const ApiBuilderLayer = HttpApiBuilder.api(InvokeApi).pipe(Layer.provide(HandlersLayer));

const withRawRoutes = (apiApp: HttpApp.Default) =>
  RawRouter.pipe(
    Effect.catchTag("RouteNotFound", () => apiApp),
    Effect.catchAll(() => Effect.succeed(HttpServerResponse.text("Not Found", { status: 404 }))),
  );

const PlatformLayer = Layer.mergeAll(
  BunHttpServer.layer({ port }),
  BunFileSystem.layer,
  BunPath.layer,
);

export const ServerLive = HttpApiBuilder.serve(withRawRoutes).pipe(
  Layer.provide(Layer.mergeAll(ApiBuilderLayer, CorsHttpMiddlewareLive, RequestLoggerLive)),
  Layer.provide(ServicesLayer),
  Layer.provide(PlatformLayer),
);

console.log(`invoke server listening on http://localhost:${port}`);
BunRuntime.runMain(Layer.launch(ServerLive));
