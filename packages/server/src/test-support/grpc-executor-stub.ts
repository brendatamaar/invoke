import { Context, Effect, Layer, Stream } from "effect";
import {
  GrpcExecutor,
  type ExecuteRequest,
  type GrpcExecuteRequest,
  type GrpcReflectRequest,
  type GrpcStreamCloseRequest,
  type GrpcStreamPollRequest,
  type GrpcStreamSendRequest,
  type WebSocketCloseRequest,
  type WebSocketConnectRequest,
  type WebSocketPollRequest,
  type WebSocketSendRequest,
} from "../services/grpc-executor.js";
import { GrpcCallError, GrpcStreamError } from "../errors.js";

type GrpcExecutorService = Context.Tag.Service<typeof GrpcExecutor>;

export type GrpcStubConfig = Partial<{
  readonly ping: GrpcExecutorService["ping"];
  readonly execute: GrpcExecutorService["execute"];
  readonly grpcReflect: GrpcExecutorService["grpcReflect"];
  readonly grpcExecute: GrpcExecutorService["grpcExecute"];
  readonly grpcStreamOpen: GrpcExecutorService["grpcStreamOpen"];
  readonly grpcStreamSend: GrpcExecutorService["grpcStreamSend"];
  readonly grpcStreamClose: GrpcExecutorService["grpcStreamClose"];
  readonly grpcStreamPoll: GrpcExecutorService["grpcStreamPoll"];
  readonly webSocketConnect: GrpcExecutorService["webSocketConnect"];
  readonly webSocketSend: GrpcExecutorService["webSocketSend"];
  readonly webSocketPoll: GrpcExecutorService["webSocketPoll"];
  readonly webSocketClose: GrpcExecutorService["webSocketClose"];
  readonly executeStream: GrpcExecutorService["executeStream"];
  readonly grpcServerStream: GrpcExecutorService["grpcServerStream"];
}>;

const unsupportedUnary =
  <Req>(method: string) =>
  (_req: Req) =>
    Effect.fail(new GrpcCallError({ method, cause: "not stubbed" }));

const unsupportedStream =
  <Req>(method: string) =>
  (_req: Req) =>
    Stream.fail(new GrpcStreamError({ method, cause: "not stubbed" }));

export const makeGrpcExecutorStub = (config: GrpcStubConfig = {}) =>
  Layer.succeed(GrpcExecutor, {
    ping:
      config.ping ??
      (() =>
        Effect.succeed({
          message: "pong from test",
          version: "test",
          uptimeMs: 1,
        })),
    execute: config.execute ?? unsupportedUnary<ExecuteRequest>("Execute"),
    grpcReflect: config.grpcReflect ?? unsupportedUnary<GrpcReflectRequest>("GrpcReflect"),
    grpcExecute: config.grpcExecute ?? unsupportedUnary<GrpcExecuteRequest>("GrpcExecute"),
    grpcStreamOpen: config.grpcStreamOpen ?? unsupportedUnary<GrpcExecuteRequest>("GrpcStreamOpen"),
    grpcStreamSend:
      config.grpcStreamSend ?? unsupportedUnary<GrpcStreamSendRequest>("GrpcStreamSend"),
    grpcStreamClose:
      config.grpcStreamClose ?? unsupportedUnary<GrpcStreamCloseRequest>("GrpcStreamClose"),
    grpcStreamPoll:
      config.grpcStreamPoll ?? unsupportedUnary<GrpcStreamPollRequest>("GrpcStreamPoll"),
    webSocketConnect:
      config.webSocketConnect ?? unsupportedUnary<WebSocketConnectRequest>("WebSocketConnect"),
    webSocketSend: config.webSocketSend ?? unsupportedUnary<WebSocketSendRequest>("WebSocketSend"),
    webSocketPoll: config.webSocketPoll ?? unsupportedUnary<WebSocketPollRequest>("WebSocketPoll"),
    webSocketClose:
      config.webSocketClose ?? unsupportedUnary<WebSocketCloseRequest>("WebSocketClose"),
    executeStream: config.executeStream ?? unsupportedStream<ExecuteRequest>("ExecuteStream"),
    grpcServerStream:
      config.grpcServerStream ?? unsupportedStream<GrpcExecuteRequest>("GrpcServerStream"),
  });
