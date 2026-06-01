import { grpcExecute } from "../api";
import { resolveCurrentGrpcRequest } from "./resolveRequest";
import { useStore } from "../../../store";

export async function runGrpcHealthCheck() {
  const { set, addToast } = useStore.getState();
  const { request } = resolveCurrentGrpcRequest();
  set({ grpcStatus: "Health check...", grpcLatencyMs: undefined });

  try {
    const response = await grpcExecute(
      { ...request, service: "grpc.health.v1.Health", method: "Check", body: "{}" },
      undefined,
    );
    const durationMs = response.durationMs;
    if (response.error) {
      set({
        grpcStatus: `Health: ${response.statusMessage || response.error}`,
        grpcLatencyMs: undefined,
      });
      addToast("warn", `Health check: ${response.statusMessage || response.error}`);
      return;
    }
    const servingStatus = parseServingStatus(response.bodyJson);
    if (servingStatus !== "SERVING") {
      const label = servingStatus ?? "UNKNOWN";
      set({ grpcStatus: `Health: ${label}`, grpcLatencyMs: undefined });
      addToast("warn", `Health check: ${label}`);
      return;
    }
    set({
      grpcStatus: `Health: OK (${durationMs?.toFixed(0)}ms)`,
      grpcLatencyMs: durationMs,
    });
    addToast("success", "Health check passed");
  } catch (error) {
    set({ grpcStatus: "Health check failed", grpcLatencyMs: undefined });
    addToast("error", String(error));
  }
}

function parseServingStatus(bodyJson: string | undefined): string | undefined {
  if (!bodyJson) return undefined;
  try {
    const parsed = JSON.parse(bodyJson) as { status?: string };
    return parsed.status;
  } catch {
    return undefined;
  }
}
