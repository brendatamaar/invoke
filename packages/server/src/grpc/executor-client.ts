import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

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

const executorAddress = process.env.EXECUTOR_GRPC_ADDR ?? "127.0.0.1:50051";

export const executorClient = new ExecutorClient(
  executorAddress,
  grpc.credentials.createInsecure(),
);

export type ExecutorUnaryMethod =
  | "Ping"
  | "Execute"
  | "WebSocketConnect"
  | "WebSocketSend"
  | "WebSocketPoll"
  | "WebSocketClose"
  | "GrpcReflect"
  | "GrpcExecute"
  | "GrpcStreamOpen"
  | "GrpcStreamSend"
  | "GrpcStreamClose"
  | "GrpcStreamPoll";

export function grpcCall<T>(
  method: ExecutorUnaryMethod,
  payload: unknown,
): Promise<T> {
  return grpcCallWithSignal(method, payload);
}

export function grpcCallWithSignal<T>(
  method: ExecutorUnaryMethod,
  payload: unknown,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolveCall, reject) => {
    if (signal?.aborted) {
      reject(Object.assign(new Error("cancelled"), { code: "CANCELLED" }));
      return;
    }
    const call = executorClient[method](
      payload,
      (error: grpc.ServiceError | null, response: T) => {
        if (error) reject(error);
        else resolveCall(response);
      },
    );
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          (call as any).cancel?.();
          reject(Object.assign(new Error("cancelled"), { code: "CANCELLED" }));
        },
        { once: true },
      );
    }
  });
}
