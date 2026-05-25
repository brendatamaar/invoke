import type { GrpcRequestConfig } from "@invoke/core";
import { coreStore, useStore } from "../../../store";
import { grpcServerStream } from "../api";

export async function runGrpcServerStream(request: GrpcRequestConfig) {
  const { set, addToast } = useStore.getState();
  const controller = new AbortController();
  const deadlineEnd = request.timeoutMs ? Date.now() + request.timeoutMs : undefined;
  set({
    grpcStreaming: true,
    grpcStreamMessages: [],
    grpcStreamController: controller,
    grpcResponse: undefined,
    grpcStatus: "Streaming...",
    grpcDeadlineEnd: deadlineEnd,
  });

  try {
    await grpcServerStream(request, {
      onMessage: (message) => {
        set((state) => ({
          grpcStreamMessages: [...state.grpcStreamMessages, message],
        }));
      },
      onDone: async (message) => {
        const msgCount = useStore
          .getState()
          .grpcStreamMessages.filter((item) => !item.done).length;
        const response = {
          status: message.error ? 500 : 200,
          statusText: message.statusMessage ?? "OK",
          headers: message.trailers ?? [],
          body: `${msgCount} stream messages`,
          timing: {
            dnsMs: 0,
            tcpMs: 0,
            tlsMs: 0,
            ttfbMs: 0,
            transferMs: 0,
            totalMs: message.durationMs ?? 0,
          },
          requestSize: 0,
          responseSize: 0,
        };
        set((state) => ({
          grpcStreamMessages: [...state.grpcStreamMessages, message],
          grpcStreaming: false,
          grpcStreamController: undefined,
          grpcStatus: message.error
            ? `Error: ${message.statusMessage}`
            : `Done - ${msgCount} messages`,
          grpcDeadlineEnd: undefined,
        }));
        await coreStore.addHistory({ request, response, protocol: "grpc" });
      },
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error).name !== "AbortError") addToast("error", String(error));
    set({
      grpcStreaming: false,
      grpcStreamController: undefined,
      grpcStatus: "Cancelled",
      grpcDeadlineEnd: undefined,
    });
  }
}
