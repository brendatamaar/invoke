import {
  HttpApiBuilder,
  HttpApiClient,
  HttpApp,
  HttpBody,
  HttpClient,
  HttpClientError,
  HttpClientResponse,
  HttpServer,
} from "@effect/platform";
import { Effect, Layer, Stream, type Scope } from "effect";
import { InvokeApi } from "../api/index.js";
import { RawRouter } from "../api/raw-router.js";
import { ExecuteLive } from "../api/handlers/execute.js";
import { GrpcLive } from "../api/handlers/grpc.js";
import { HealthLive } from "../api/handlers/health.js";
import { MockLive } from "../api/handlers/mock.js";
import { MockGrpcLive } from "../api/handlers/mock-grpc.js";
import { MockGrpcRecordLive } from "../api/handlers/mock-grpc-record.js";
import { OAuth2Live } from "../api/handlers/oauth2.js";
import { ProxyLive } from "../api/handlers/proxy.js";
import { WebSocketLive } from "../api/handlers/websocket.js";
import { WebhookLive } from "../api/handlers/webhook.js";
import { CorsHttpMiddlewareLive } from "../middleware/cors.js";
import {
  RateLimitExecuteLive,
  RateLimitGrpcLive,
  RateLimitWsConnectLive,
} from "../middleware/rate-limit.js";
import { MockGrpcRecorderLive } from "../services/mock-grpc-recorder.js";
import { MockGrpcStoreLive } from "../services/mock-grpc-store.js";
import { MockStoreLive } from "../services/mock-store.js";
import { OAuth2StoreLive } from "../services/oauth2-store.js";
import { ProxyRecordStoreLive } from "../services/proxy-record-store.js";
import { RateLimiterLive } from "../services/rate-limiter.js";
import { SsrfGuardLive } from "../services/ssrf-guard.js";
import { WebhookStoreLive } from "../services/webhook-store.js";
import { makeGrpcExecutorStub, type GrpcStubConfig } from "./grpc-executor-stub.js";

export interface TestServer {
  readonly fetch: FetchLike;
  readonly dispose: () => Promise<void>;
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const makeServicesLayer = (grpc: GrpcStubConfig) =>
  Layer.mergeAll(
    makeGrpcExecutorStub(grpc),
    ProxyRecordStoreLive,
    MockStoreLive,
    MockGrpcStoreLive,
    MockGrpcRecorderLive,
    OAuth2StoreLive,
    WebhookStoreLive,
    RateLimiterLive,
    SsrfGuardLive,
  );

const makeMiddlewareLayer = (servicesLayer: Layer.Layer<any, never, never>) =>
  Layer.mergeAll(RateLimitExecuteLive, RateLimitWsConnectLive, RateLimitGrpcLive).pipe(
    Layer.provide(servicesLayer),
  );

const makeHandlersLayer = (
  servicesLayer: Layer.Layer<any, never, never>,
  middlewareLayer: Layer.Layer<any, never, never>,
) =>
  Layer.mergeAll(
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
  ).pipe(Layer.provide(Layer.mergeAll(servicesLayer, middlewareLayer)));

const isRawPath = (pathname: string) =>
  pathname.startsWith("/mock/") ||
  pathname.startsWith("/webhook/") ||
  pathname === "/api/oauth2/callback" ||
  pathname === "/api/openapi.json" ||
  pathname === "/api/docs";

export const makeTestServer = (grpc: GrpcStubConfig = {}) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const servicesLayer = makeServicesLayer(grpc);
      const middlewareLayer = makeMiddlewareLayer(servicesLayer);
      const handlersLayer = makeHandlersLayer(servicesLayer, middlewareLayer);
      const memoMap = yield* Layer.makeMemoMap;
      const apiLayer = Layer.mergeAll(
        HttpApiBuilder.api(InvokeApi).pipe(Layer.provide(handlersLayer)),
        CorsHttpMiddlewareLive,
        HttpServer.layerContext,
      );

      const api = HttpApiBuilder.toWebHandler(apiLayer, { memoMap });
      const raw = HttpApp.toWebHandlerLayer(
        RawRouter,
        Layer.mergeAll(servicesLayer, HttpServer.layerContext),
        { memoMap },
      );

      const handleRequest = (request: Request) => {
        const { pathname } = new URL(request.url);
        return isRawPath(pathname) ? raw.handler(request) : api.handler(request);
      };

      const fetchImpl: FetchLike = (input, init) => {
        const request =
          input instanceof Request ? new Request(input, init) : new Request(input, init);
        return handleRequest(request);
      };

      return {
        fetch: fetchImpl,
        dispose: async () => {
          await Promise.all([api.dispose(), raw.dispose()]);
        },
      };
    }),
    (server) => Effect.promise(() => server.dispose()).pipe(Effect.orDie),
  );

const toBodyInit = (body: HttpBody.HttpBody) => {
  switch (body._tag) {
    case "Raw":
    case "Uint8Array":
      return Effect.succeed(body.body as BodyInit);
    case "FormData":
      return Effect.succeed(body.formData);
    case "Stream":
      return Stream.toReadableStreamEffect(body.stream).pipe(
        Effect.map((stream) => stream as BodyInit),
      );
    case "Empty":
      return Effect.succeed(undefined);
  }
};

const makeHttpClient = (fetchImpl: FetchLike) =>
  HttpClient.make((request, url, signal) =>
    Effect.flatMap(toBodyInit(request.body), (body) =>
      Effect.tryPromise({
        try: () =>
          fetchImpl(url, {
            method: request.method,
            headers: request.headers,
            body,
            duplex: request.body._tag === "Stream" ? "half" : undefined,
            signal,
          } as RequestInit & { duplex?: "half" }),
        catch: (cause) =>
          new HttpClientError.RequestError({
            request,
            reason: "Transport",
            cause,
          }),
      }).pipe(Effect.map((response) => HttpClientResponse.fromWeb(request, response))),
    ),
  );

export const makeTestClient = (server: TestServer) =>
  HttpApiClient.makeWith(InvokeApi, {
    httpClient: makeHttpClient(server.fetch),
    baseUrl: "http://localhost",
  });

export const withGlobalFetch =
  (fetchImpl: FetchLike) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.acquireUseRelease(
      Effect.sync(() => {
        const original = globalThis.fetch;
        globalThis.fetch = fetchImpl as typeof fetch;
        return original;
      }),
      () => effect,
      (original) =>
        Effect.sync(() => {
          globalThis.fetch = original;
        }),
    );

export const runScoped = <A, E>(effect: Effect.Effect<A, E, Scope.Scope>) =>
  Effect.runPromise(Effect.scoped(effect));
