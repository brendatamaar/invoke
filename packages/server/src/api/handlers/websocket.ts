import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import type { WebSocketConnectInput } from "../../types/index.js";
import { websocketConnectPayload } from "../../features/websocket/payload.js";
import { GrpcExecutor } from "../../services/grpc-executor.js";
import { SsrfGuard } from "../../services/ssrf-guard.js";
import { InvokeApi } from "../index.js";
import { pollingSse, sseEvent, sseResponse } from "./sse.js";

const SSE_MAX_MESSAGES = 50;

export const WebSocketLive = HttpApiBuilder.group(InvokeApi, "websocket", (handlers) =>
  handlers
    .handle("connect", ({ payload }) =>
      Effect.gen(function* () {
        const guard = yield* SsrfGuard;
        const ssrf = yield* guard.check(payload.url).pipe(Effect.either);
        if (ssrf._tag === "Left") {
          return HttpServerResponse.unsafeJson({ error: ssrf.left.reason }, { status: 403 });
        }
        const executor = yield* GrpcExecutor;
        return yield* executor.webSocketConnect(
          websocketConnectPayload(payload as WebSocketConnectInput),
        );
      }),
    )
    .handle("send", ({ payload }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        return yield* executor.webSocketSend(payload);
      }),
    )
    .handle("poll", ({ payload }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        return yield* executor.webSocketPoll(payload);
      }),
    )
    .handle("close", ({ payload }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        return yield* executor.webSocketClose(payload);
      }),
    )
    .handle("events", ({ urlParams }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        const poll = executor.webSocketPoll({
          connectionId: urlParams.connectionId,
          maxMessages: SSE_MAX_MESSAGES,
        });
        return sseResponse(
          pollingSse(
            poll,
            (result: any) => {
              const events = (result.messages ?? []).map((message: unknown) =>
                sseEvent("message", message),
              );
              const connected = result.connected ?? false;
              if (!connected) {
                events.push(
                  sseEvent("close", {
                    reason: result.error ?? "server closed connection",
                  }),
                );
              }
              return { events, done: !connected };
            },
            (error) => sseEvent("close", { reason: String(error) }),
          ),
        );
      }),
    ),
);
