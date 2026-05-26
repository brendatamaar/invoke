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
  const deadlineTimer = request.timeoutMs
    ? setTimeout(() => controller.abort(), request.timeoutMs + 500)
    : undefined;
  set({
    grpcStatus: "Executing...",
    grpcExecuteController: controller,
    grpcResponse: undefined,
    grpcSentMetadata: [],
    grpcStreamMessages: [],
    grpcAssertionResults: [],
    grpcDeadlineEnd: deadlineEnd,
  });

  try {
    const grpcResponse = await grpcExecute(request, controller.signal);
    clearTimeout(deadlineTimer);
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

    const isClientSideError = !!grpcResponse.error && grpcResponse.statusCode === 0;
    const assertionResults = isClientSideError
      ? []
      : runAssertions(execResponse, request.assertions ?? []);
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
      grpcSentMetadata: (request.metadata ?? []).filter((m) => m.enabled !== false),
      grpcAssertionResults: assertionResults,
      sessionVariables: { ...sessionVariables, ...extracted },
      grpcDeadlineEnd: undefined,
    });
    await coreStore.addHistory({ request, response: execResponse, protocol: "grpc" });
  } catch (error) {
    clearTimeout(deadlineTimer);
    if ((error as Error).name !== "AbortError") addToast("error", String(error));
    set({
      grpcStatus: "Error",
      grpcExecuteController: undefined,
      grpcDeadlineEnd: undefined,
    });
  }
}
