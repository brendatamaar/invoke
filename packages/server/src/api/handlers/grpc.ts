import { HttpApiBuilder } from "@effect/platform";
import { Effect, Stream } from "effect";
import type {
  GrpcExecuteInput,
  GrpcReflectInput,
  GrpcStreamCloseInput,
  GrpcStreamSendInput,
} from "../../types/index.js";
import { grpcPayload } from "../../features/grpc/payload.js";
import { GrpcExecutor } from "../../services/grpc-executor.js";
import { InvokeApi } from "../index.js";
import { pollingSse, sseData, sseResponse } from "./sse.js";

const SSE_MAX_MESSAGES = 50;

function grpcExecutePayload(input: GrpcExecuteInput) {
  return {
    ...grpcPayload(input),
    fullMethod: input.fullMethod,
    bodyJson: input.bodyJson,
    compression: input.compression === "gzip" ? "gzip" : "",
  };
}

function formatGrpcStreamMessage(message: any) {
  return {
    bodyJson: message.bodyJson ?? "",
    done: message.done ?? false,
    error: message.error || undefined,
    trailers: message.trailers ?? [],
    statusCode: message.statusCode ?? 0,
    statusMessage: message.statusMessage ?? "",
    durationMs: message.durationMs ?? 0,
  };
}

function formatGrpcPollMessage(message: any) {
  return {
    bodyJson: message.bodyJson ?? "",
    done: message.done ?? false,
    error: message.error || undefined,
    trailers: message.trailers ?? [],
    initialMetadata: message.initialMetadata ?? [],
    statusCode: message.statusCode ?? 0,
    statusMessage: message.statusMessage ?? "",
  };
}

export const GrpcLive = HttpApiBuilder.group(InvokeApi, "grpc", (handlers) =>
  handlers
    .handle("reflect", ({ payload }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        return yield* executor.grpcReflect(grpcPayload(payload as GrpcReflectInput));
      }),
    )
    .handle("execute", ({ payload }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        return yield* executor.grpcExecute(grpcExecutePayload(payload as GrpcExecuteInput));
      }),
    )
    .handle("serverStream", ({ payload }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        const stream = executor
          .grpcServerStream(grpcExecutePayload(payload as GrpcExecuteInput))
          .pipe(
            Stream.map((message) => sseData(formatGrpcStreamMessage(message))),
            Stream.catchAll((error) =>
              Stream.succeed(
                sseData({
                  bodyJson: "",
                  done: true,
                  error: String((error as any)?.message ?? error),
                }),
              ),
            ),
          );
        return sseResponse(stream);
      }),
    )
    .handle("streamOpen", ({ payload }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        return yield* executor.grpcStreamOpen(grpcExecutePayload(payload as GrpcExecuteInput));
      }),
    )
    .handle("streamSend", ({ payload }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        const input = payload as GrpcStreamSendInput;
        return yield* executor.grpcStreamSend({
          streamId: input.streamId,
          bodyJson: input.bodyJson,
        });
      }),
    )
    .handle("streamClose", ({ payload }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        const input = payload as GrpcStreamCloseInput;
        return yield* executor.grpcStreamClose({ streamId: input.streamId });
      }),
    )
    .handle("streamEvents", ({ urlParams }) =>
      Effect.gen(function* () {
        const executor = yield* GrpcExecutor;
        const poll = executor.grpcStreamPoll({
          streamId: urlParams.streamId,
          maxMessages: SSE_MAX_MESSAGES,
        });
        return sseResponse(
          pollingSse(
            poll,
            (result: any) => {
              const messages = (result.messages ?? []) as any[];
              const events: string[] = [];
              let doneFromMessage = false;
              for (const message of messages) {
                events.push(sseData(formatGrpcPollMessage(message)));
                if (message.done) {
                  doneFromMessage = true;
                  break;
                }
              }
              const connected = result.connected ?? false;
              if (!connected && !doneFromMessage) {
                events.push(sseData({ bodyJson: "", done: true }));
              }
              return { events, done: doneFromMessage || !connected };
            },
            () => sseData({ error: "stream not found", done: true }),
          ),
        );
      }),
    ),
);
