import type { GrpcMethodInfo, GrpcRequestConfig } from "@invoke/core";
import { useStore } from "../../../store";
import { grpcStreamEvents, grpcStreamOpen } from "../api";

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

  try {
    const { streamId, error } = await grpcStreamOpen(request);
    if (error || !streamId) throw new Error(error ?? "Failed to open stream");
    set({ grpcStreamId: streamId, grpcStatus: "Stream open" });
    const controller = new AbortController();
    set({ grpcStreamController: controller });
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
    addToast("error", String(error));
    set({
      grpcStreaming: false,
      grpcStatus: "Error",
      grpcDeadlineEnd: undefined,
    });
  }
}
