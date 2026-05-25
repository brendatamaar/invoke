import {
  extractVariables,
  runAssertions,
  runPostResponseScript,
  type GrpcRequestConfig,
} from "@invoke/core";
import { coreStore, useStore } from "../../../store";
import { grpcExecute } from "../api";
import { grpcResponseToExecuteResponse } from "./protocolBar";

export async function runGrpcUnary(
  request: GrpcRequestConfig,
  sessionVariables: Record<string, string>,
) {
  const { set, addToast } = useStore.getState();
  const controller = new AbortController();
  const deadlineEnd = request.timeoutMs ? Date.now() + request.timeoutMs : undefined;
  set({
    grpcStatus: "Executing...",
    grpcExecuteController: controller,
    grpcResponse: undefined,
    grpcAssertionResults: [],
    grpcDeadlineEnd: deadlineEnd,
  });

  try {
    const grpcResponse = await grpcExecute(request, controller.signal);
    const execResponse = grpcResponseToExecuteResponse(grpcResponse);
    try {
      const postResult = await runPostResponseScript(
        request,
        execResponse,
        sessionVariables,
        request.scripts?.postResponse ?? "",
      );
      set((state) => ({
        consoleLogs: {
          ...state.consoleLogs,
          postResponse: postResult.logs,
          postResponseError: undefined,
          postResponseRan: true,
        },
      }));
    } catch (error) {
      set((state) => ({
        consoleLogs: {
          ...state.consoleLogs,
          postResponseError: String(error),
          postResponseRan: true,
        },
      }));
    }

    const assertionResults = runAssertions(
      execResponse,
      request.assertions ?? [],
    );
    const extracted = extractVariables(
      execResponse,
      request.extractionRules ?? [],
    );
    set({
      grpcStatus: grpcResponse.error
        ? `Error: ${grpcResponse.statusMessage}`
        : `Done - ${grpcResponse.durationMs?.toFixed(0)}ms`,
      grpcExecuteController: undefined,
      grpcResponse,
      grpcAssertionResults: assertionResults,
      sessionVariables: { ...sessionVariables, ...extracted },
      grpcDeadlineEnd: undefined,
    });
    await coreStore.addHistory({ request, response: execResponse, protocol: "grpc" });
  } catch (error) {
    if ((error as Error).name !== "AbortError") addToast("error", String(error));
    set({
      grpcStatus: "Error",
      grpcExecuteController: undefined,
      grpcDeadlineEnd: undefined,
    });
  }
}
