import {
  resolveRequest,
  runPreRequestScript,
  type RequestConfig,
  type RequestDraft,
  type VariableScope,
} from "@invoke/core";

export async function resolveWithPreRequestScript({
  activeRequest,
  vars,
  buildScopes,
}: {
  activeRequest: RequestDraft;
  vars: Record<string, string>;
  buildScopes: (request: RequestConfig) => VariableScope[];
}) {
  let preRequestLogs: string[] = [];
  let preRequestError: string | undefined;
  try {
    const scriptContext = await runPreRequestScript(
      activeRequest as RequestConfig,
      vars,
      activeRequest.scripts?.preRequest ?? "",
    );
    preRequestLogs = scriptContext.logs;
    const effectiveRequest = (scriptContext.request ?? activeRequest) as RequestConfig;
    const result = resolveRequest(effectiveRequest, buildScopes(effectiveRequest));
    return {
      resolved: result.request,
      unresolved: result.unresolved,
      preRequestLogs,
      preRequestError,
    };
  } catch (error) {
    preRequestError = String(error);
    const result = resolveRequest(
      activeRequest as RequestConfig,
      buildScopes(activeRequest as RequestConfig),
    );
    return {
      resolved: result.request,
      unresolved: result.unresolved,
      preRequestLogs,
      preRequestError,
    };
  }
}
