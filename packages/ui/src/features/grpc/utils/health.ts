import { grpcExecute } from "../api";
import { resolveCurrentGrpcRequest } from "./resolveRequest";
import { useStore } from "../../../store";

export async function runGrpcHealthCheck() {
  const { set, addToast } = useStore.getState();
  const { request } = resolveCurrentGrpcRequest();
  set({ grpcStatus: "Health check...", grpcLatencyMs: undefined });
  const start = Date.now();

  try {
    const response = await grpcExecute(
      { ...request, service: "grpc.health.v1.Health", method: "Check" },
      undefined,
    );
    const latencyMs = Date.now() - start;
    if (response.error) {
      set({
        grpcStatus: `Health: ${response.statusMessage || response.error}`,
        grpcLatencyMs: undefined,
      });
      addToast("warn", `Health check: ${response.statusMessage || response.error}`);
      return;
    }
    set({
      grpcStatus: `Health: OK (${response.durationMs?.toFixed(0)}ms)`,
      grpcLatencyMs: latencyMs,
    });
    addToast("success", "Health check passed");
  } catch (error) {
    set({ grpcStatus: "Health check failed", grpcLatencyMs: undefined });
    addToast("error", String(error));
  }
}
