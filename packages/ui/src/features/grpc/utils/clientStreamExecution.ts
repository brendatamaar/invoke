import type { GrpcMethodInfo, GrpcRequestConfig } from "@invoke/core";
import { useStore } from "../../../store";
import { grpcStreamClose, grpcStreamEvents, grpcStreamOpen } from "../api";

export async function openGrpcClientStream(
  request: GrpcRequestConfig,
  selectedMethod?: GrpcMethodInfo,
) {
  const { set, addToast } = useStore.getState();
  const deadlineEnd = request.timeoutMs ? Date.now() + request.timeoutMs : undefined;
  set({
    grpcStreaming: true,
    grpcStreamSentMessages: [],
    grpcStreamReceivedMessages: [],
    grpcStatus: "Opening stream...",
    grpcDeadlineEnd: deadlineEnd,
  });

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { streamId, error } = await grpcStreamOpen(request);
    if (error || !streamId) throw new Error(error ?? "Failed to open stream");
    set({ grpcStreamId: streamId, grpcStatus: "Stream open" });
    const controller = new AbortController();
    set({ grpcStreamController: controller });
    const msLeft = deadlineEnd ? Math.max(0, deadlineEnd - Date.now()) : undefined;
    deadlineTimer = msLeft !== undefined
      ? setTimeout(async () => {
          try { await grpcStreamClose(streamId); } catch {}
          controller.abort();
          useStore.getState().set({
            grpcStreamId: undefined,
            grpcStreaming: false,
            grpcStreamController: undefined,
            grpcStatus: "Deadline exceeded",
            grpcDeadlineEnd: undefined,
          });
        }, msLeft + 500)
      : undefined;
    if (selectedMethod?.serverStreaming) {
      grpcStreamEvents(streamId, {
        onMessage: (message) => {
          set((state) => ({
            grpcStreamReceivedMessages: [
              ...state.grpcStreamReceivedMessages,
              message,
            ],
          }));
        },
        onDone: (message) => {
          clearTimeout(deadlineTimer);
          set((state) => ({
            grpcStreamReceivedMessages: [
              ...state.grpcStreamReceivedMessages,
              message,
            ],
            grpcStreaming: false,
            grpcStreamId: undefined,
            grpcStreamController: undefined,
            grpcStatus: message.error
              ? `Error: ${message.statusMessage}`
              : "Stream closed",
            grpcDeadlineEnd: undefined,
          }));
        },
        signal: controller.signal,
      }).catch(() => {});
    }
  } catch (error) {
    clearTimeout(deadlineTimer);
    addToast("error", String(error));
    set({
      grpcStreaming: false,
      grpcStatus: "Error",
      grpcDeadlineEnd: undefined,
    });
  }
}
