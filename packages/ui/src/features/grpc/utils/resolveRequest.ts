import { resolveGrpcRequest, runPreRequestScript, type GrpcRequestConfig } from "@invoke/core";
import { useStore } from "../../../store";

export function resolveCurrentGrpcRequest() {
  const state = useStore.getState();
  const activeEnv = state.environments.find(
    (environment) => environment.id === state.activeEnvironmentId,
  );
  return {
    request: resolveGrpcRequest(state.grpcRequest, activeEnv, state.sessionVariables).request,
    sessionVariables: state.sessionVariables,
  };
}

export async function resolveGrpcWithPreRequest(): Promise<{
  request: GrpcRequestConfig;
  sessionVariables: Record<string, string>;
}> {
  const state = useStore.getState();
  const { request: initialRequest, sessionVariables } = resolveCurrentGrpcRequest();
  let request = initialRequest;

  try {
    const scriptResult = await runPreRequestScript(
      request,
      sessionVariables,
      request.scripts?.preRequest ?? "",
    );
    request = scriptResult.request;
    state.set((current) => ({
      consoleLogs: {
        ...current.consoleLogs,
        preRequest: scriptResult.logs,
        preRequestError: undefined,
        preRequestRan: true,
      },
    }));
  } catch (error) {
    state.set((current) => ({
      consoleLogs: {
        ...current.consoleLogs,
        preRequestError: String(error),
        preRequestRan: true,
      },
    }));
  }

  return { request, sessionVariables };
}
