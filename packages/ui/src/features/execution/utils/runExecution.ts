import type { RequestConfig, RequestDraft } from "@invoke/core";
import type { AppState } from "../../../types";
import { executeStream, executeWithRetry } from "../../execute/api";
import { executeWithAPQ } from "../../execute/apq";
import { finalizeResponseExecution, finalizeStreamExecution } from "./finalize";
import { buildGraphQLExecutionRequest } from "./graphqlRequest";
import type { resolveWithPreRequestScript } from "./preRequest";

export function buildActiveRequest({
  protocol,
  request,
  graphqlRequest,
  graphqlFileUploads,
  set,
  addToast,
}: {
  protocol: RequestDraft["protocol"];
  request: RequestDraft;
  graphqlRequest: Parameters<typeof buildGraphQLExecutionRequest>[0]["graphqlRequest"];
  graphqlFileUploads: Parameters<typeof buildGraphQLExecutionRequest>[0]["graphqlFileUploads"];
  set: AppState["set"];
  addToast: AppState["addToast"];
}) {
  if (protocol !== "graphql") return request;
  return buildGraphQLExecutionRequest({
    request,
    graphqlRequest,
    graphqlFileUploads,
    set,
    addToast,
  });
}

type PreparedRequest = Awaited<ReturnType<typeof resolveWithPreRequestScript>>;

export async function runStreamingRequest({
  resolved,
  protocol,
  prepared,
  assertionRules,
  extractRules,
  sessionVariables,
  enableCookies,
  set,
  addToast,
}: {
  resolved: RequestConfig;
  protocol: NonNullable<RequestDraft["protocol"]>;
  prepared: PreparedRequest;
  assertionRules: Parameters<typeof finalizeStreamExecution>[0]["assertionRules"];
  extractRules: Parameters<typeof finalizeStreamExecution>[0]["extractRules"];
  sessionVariables: Record<string, string>;
  enableCookies: boolean;
  set: AppState["set"];
  addToast: AppState["addToast"];
}) {
  const controller = new AbortController();
  set({
    streaming: true,
    loading: false,
    response: undefined,
    streamBytes: 0,
    streamController: controller,
    retryAttempts: undefined,
    consoleLogs: {
      preRequest: prepared.preRequestLogs,
      preRequestError: prepared.preRequestError,
      preRequestRan: true,
      postResponse: [],
      postResponseRan: false,
    },
  });
  try {
    await executeStream(resolved, {
      onChunk: (chunk) => set((state) => ({ streamBytes: state.streamBytes + chunk.length })),
      onFinal: async (rawResponse) => {
        await finalizeStreamExecution({
          rawResponse,
          resolved,
          assertionRules,
          extractRules,
          sessionVariables,
          protocol,
          enableCookies,
          set,
        });
      },
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if ((error as Error).name !== "AbortError") addToast("error", String(error));
    set({ streaming: false });
  }
}

export async function runBufferedRequest({
  resolved,
  activeRequest,
  protocol,
  prepared,
  vars,
  graphqlRequest,
  assertionRules,
  extractRules,
  sessionVariables,
  enableCookies,
  set,
  addToast,
}: {
  resolved: RequestConfig;
  activeRequest: RequestDraft;
  protocol: NonNullable<RequestDraft["protocol"]>;
  prepared: PreparedRequest;
  vars: Record<string, string>;
  graphqlRequest: Parameters<typeof buildGraphQLExecutionRequest>[0]["graphqlRequest"];
  assertionRules: Parameters<typeof finalizeResponseExecution>[0]["assertionRules"];
  extractRules: Parameters<typeof finalizeResponseExecution>[0]["extractRules"];
  sessionVariables: Record<string, string>;
  enableCookies: boolean;
  set: AppState["set"];
  addToast: AppState["addToast"];
}) {
  const controller = new AbortController();
  set({
    loading: true,
    loadController: controller,
    response: undefined,
    retryAttempts: undefined,
  });
  try {
    const rawResponse = await (protocol === "graphql" &&
    graphqlRequest.apq &&
    !graphqlRequest.batchMode
      ? executeWithAPQ(resolved, controller.signal, graphqlRequest.query ?? "")
      : executeWithRetry(resolved, controller.signal));
    const result = await finalizeResponseExecution({
      rawResponse,
      resolved,
      activeRequest,
      vars,
      preRequestLogs: prepared.preRequestLogs,
      preRequestError: prepared.preRequestError,
      assertionRules,
      extractRules,
      sessionVariables,
      protocol,
      enableCookies,
      set,
    });
    return result.isProxyRequest;
  } catch (error) {
    if ((error as Error).name !== "AbortError") addToast("error", String(error));
    set({ loading: false, loadController: undefined });
    return false;
  }
}
