import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { Context, Effect, Layer, Stream } from "effect";
import { GrpcCallError, GrpcStreamError } from "../errors.js";
import type { executePayload } from "../features/execute/payload.js";
import type { grpcPayload } from "../features/grpc/payload.js";
import type { websocketConnectPayload } from "../features/websocket/payload.js";

export type ExecuteRequest = ReturnType<typeof executePayload>;
export type GrpcReflectRequest = ReturnType<typeof grpcPayload>;
export type GrpcExecuteRequest = GrpcReflectRequest & {
  fullMethod: string;
  bodyJson: string;
  compression: string;
};
export type GrpcStreamSendRequest = { streamId: string; bodyJson: string };
export type GrpcStreamCloseRequest = { streamId: string };
export type GrpcStreamPollRequest = {
  streamId: string;
  maxMessages?: number;
};
export type WebSocketConnectRequest = ReturnType<typeof websocketConnectPayload>;
export type WebSocketSendRequest = {
  connectionId: string;
  body: string;
  binary: boolean;
};
export type WebSocketPollRequest = {
  connectionId: string;
  maxMessages?: number;
};
export type WebSocketCloseRequest = {
  connectionId: string;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../../..");
const protoPath = resolve(root, "proto/executor.proto");

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
});
const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
const ExecutorClient = loaded.invoke.executor.HttpExecutor;

type ExecutorClientInstance = InstanceType<typeof ExecutorClient>;

export class GrpcExecutor extends Context.Tag("GrpcExecutor")<
  GrpcExecutor,
  {
    readonly ping: () => Effect.Effect<unknown, GrpcCallError>;
    readonly execute: (req: ExecuteRequest) => Effect.Effect<unknown, GrpcCallError>;
    readonly grpcReflect: (req: GrpcReflectRequest) => Effect.Effect<unknown, GrpcCallError>;
    readonly grpcExecute: (req: GrpcExecuteRequest) => Effect.Effect<unknown, GrpcCallError>;
    readonly grpcStreamOpen: (req: GrpcExecuteRequest) => Effect.Effect<unknown, GrpcCallError>;
    readonly grpcStreamSend: (req: GrpcStreamSendRequest) => Effect.Effect<unknown, GrpcCallError>;
    readonly grpcStreamClose: (
      req: GrpcStreamCloseRequest,
    ) => Effect.Effect<unknown, GrpcCallError>;
    readonly grpcStreamPoll: (req: GrpcStreamPollRequest) => Effect.Effect<unknown, GrpcCallError>;
    readonly webSocketConnect: (
      req: WebSocketConnectRequest,
    ) => Effect.Effect<unknown, GrpcCallError>;
    readonly webSocketSend: (req: WebSocketSendRequest) => Effect.Effect<unknown, GrpcCallError>;
    readonly webSocketPoll: (req: WebSocketPollRequest) => Effect.Effect<unknown, GrpcCallError>;
    readonly webSocketClose: (req: WebSocketCloseRequest) => Effect.Effect<unknown, GrpcCallError>;
    readonly executeStream: (req: ExecuteRequest) => Stream.Stream<unknown, GrpcStreamError>;
    readonly grpcServerStream: (req: GrpcExecuteRequest) => Stream.Stream<unknown, GrpcStreamError>;
  }
>() {}

const makeUnary =
  <Req>(client: ExecutorClientInstance, method: string) =>
  (req: Req) =>
    Effect.async<unknown, GrpcCallError>((resume) => {
      const call = client[method](req, (error: grpc.ServiceError | null, response: unknown) => {
        if (error) {
          resume(Effect.fail(new GrpcCallError({ method, cause: error })));
        } else {
          resume(Effect.succeed(response));
        }
      });

      return Effect.sync(() => {
        call.cancel();
      });
    });

const makeServerStream =
  <Req>(client: ExecutorClientInstance, method: string) =>
  (req: Req) =>
    Stream.async<unknown, GrpcStreamError>((emit) => {
      const call = client[method](req);
      call.on("data", (chunk: unknown) => {
        void emit.single(chunk);
      });
      call.on("end", () => {
        void emit.end();
      });
      call.on("error", (error: Error) => {
        void emit.fail(new GrpcStreamError({ method, cause: error }));
      });

      return Effect.sync(() => {
        call.cancel();
      });
    });

export const GrpcExecutorLive = Layer.scoped(
  GrpcExecutor,
  Effect.gen(function* () {
    const address = process.env.EXECUTOR_GRPC_ADDR ?? "127.0.0.1:50051";
    const client = yield* Effect.acquireRelease(
      Effect.sync(() => new ExecutorClient(address, grpc.credentials.createInsecure())),
      (c: ExecutorClientInstance) => Effect.sync(() => c.close()),
    );

    return {
      ping: () => makeUnary<Record<string, never>>(client, "Ping")({}),
      execute: makeUnary<ExecuteRequest>(client, "Execute"),
      grpcReflect: makeUnary<GrpcReflectRequest>(client, "GrpcReflect"),
      grpcExecute: makeUnary<GrpcExecuteRequest>(client, "GrpcExecute"),
      grpcStreamOpen: makeUnary<GrpcExecuteRequest>(client, "GrpcStreamOpen"),
      grpcStreamSend: makeUnary<GrpcStreamSendRequest>(client, "GrpcStreamSend"),
      grpcStreamClose: makeUnary<GrpcStreamCloseRequest>(client, "GrpcStreamClose"),
      grpcStreamPoll: makeUnary<GrpcStreamPollRequest>(client, "GrpcStreamPoll"),
      webSocketConnect: makeUnary<WebSocketConnectRequest>(client, "WebSocketConnect"),
      webSocketSend: makeUnary<WebSocketSendRequest>(client, "WebSocketSend"),
      webSocketPoll: makeUnary<WebSocketPollRequest>(client, "WebSocketPoll"),
      webSocketClose: makeUnary<WebSocketCloseRequest>(client, "WebSocketClose"),
      executeStream: makeServerStream<ExecuteRequest>(client, "ExecuteStream"),
      grpcServerStream: makeServerStream<GrpcExecuteRequest>(client, "GrpcServerStream"),
    };
  }),
);
