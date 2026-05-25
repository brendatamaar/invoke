import { useStore } from "../../../store";
import { grpcStreamClose } from "../api";

export function cancelGrpcStream() {
  const { grpcStreamController, set } = useStore.getState();
  grpcStreamController?.abort();
  set({
    grpcStreaming: false,
    grpcStreamController: undefined,
    grpcStatus: "Cancelled",
    grpcDeadlineEnd: undefined,
  });
}

export function cancelGrpcExecute() {
  const { grpcExecuteController, set } = useStore.getState();
  grpcExecuteController?.abort();
  set({
    grpcExecuteController: undefined,
    grpcStatus: "Cancelled",
    grpcDeadlineEnd: undefined,
  });
}

export async function closeGrpcStream() {
  const { grpcStreamId, set, addToast } = useStore.getState();
  if (!grpcStreamId) return;
  set({ grpcStatus: "Closing stream..." });
  try {
    const response = await grpcStreamClose(grpcStreamId);
    const { grpcStreamController } = useStore.getState();
    grpcStreamController?.abort();
    set({
      grpcStreamId: undefined,
      grpcStreaming: false,
      grpcStreamController: undefined,
      grpcStatus: response.error
        ? `Error: ${response.error}`
        : `Done - ${response.durationMs != null ? `${response.durationMs.toFixed(0)}ms` : ""}`,
      grpcResponse:
        response.bodyJson != null
          ? {
              bodyJson: response.bodyJson,
              statusCode: response.statusCode ?? 0,
              statusMessage: response.statusMessage ?? "",
              trailers: response.trailers ?? [],
              metadata: [],
              durationMs: response.durationMs ?? 0,
              error: response.error,
            }
          : undefined,
      grpcDeadlineEnd: undefined,
    });
  } catch (error) {
    addToast("error", String(error));
    set({ grpcStatus: "Error closing stream" });
  }
}
