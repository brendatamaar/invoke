import {
  extractVariables,
  runAssertions,
  runPostResponseScript,
  type Assertion,
  type ExecuteResponse,
  type ExtractionRule,
  type RequestConfig,
  type RequestDraft,
  type RequestProtocol,
} from "@invoke/core";
import type { AppState } from "../../../types";
import { processMultipartResponse } from "../../execute/multipart";
import { coreStore } from "../../../store";
import { persistResponseCookies } from "../cookies";

type FinalizeBase = {
  resolved: RequestConfig;
  assertionRules: Assertion[];
  extractRules: ExtractionRule[];
  sessionVariables: Record<string, string>;
  protocol: RequestProtocol;
  enableCookies: boolean;
  set: AppState["set"];
};

export async function finalizeStreamExecution({
  rawResponse,
  ...base
}: FinalizeBase & {
  rawResponse: ExecuteResponse;
}) {
  const { response, parts } = processMultipartResponse(rawResponse);
  await persistCookiesIfEnabled(response, base.resolved.url, base.enableCookies);
  const results = runAssertions(response, base.assertionRules);
  const extracted = extractVariables(response, base.extractRules);
  await coreStore.addHistory({
    request: base.resolved,
    response,
    protocol: base.protocol,
  });
  base.set({
    response,
    assertionResults: results,
    sessionVariables: { ...base.sessionVariables, ...extracted },
    streaming: false,
    retryAttempts: undefined,
    graphqlDeferredParts: parts,
  });
}

export async function finalizeResponseExecution({
  rawResponse,
  activeRequest,
  vars,
  preRequestLogs,
  preRequestError,
  ...base
}: FinalizeBase & {
  rawResponse: ExecuteResponse & { retryAttempts?: number; apqRetried?: boolean };
  activeRequest: RequestDraft;
  vars: Record<string, string>;
  preRequestLogs: string[];
  preRequestError: string | undefined;
}) {
  const { response, parts } = processMultipartResponse(rawResponse);
  await persistCookiesIfEnabled(response, base.resolved.url, base.enableCookies);

  let postResponseLogs: string[] = [];
  let postResponseError: string | undefined;
  try {
    const postResult = await runPostResponseScript(
      base.resolved,
      response,
      vars,
      activeRequest.scripts?.postResponse ?? "",
    );
    postResponseLogs = postResult.logs;
  } catch (error) {
    postResponseError = String(error);
  }

  const results = runAssertions(response, base.assertionRules);
  const extracted = extractVariables(response, base.extractRules);
  await coreStore.addHistory({
    request: base.resolved,
    response,
    protocol: base.protocol,
  });
  base.set({
    response,
    assertionResults: results,
    sessionVariables: { ...base.sessionVariables, ...extracted },
    loading: false,
    loadController: undefined,
    retryAttempts: rawResponse.retryAttempts,
    apqRetried: rawResponse.apqRetried,
    graphqlDeferredParts: parts,
    consoleLogs: {
      preRequest: preRequestLogs,
      preRequestError,
      preRequestRan: true,
      postResponse: postResponseLogs,
      postResponseError,
      postResponseRan: true,
    },
  });
  return { isProxyRequest: base.resolved.url.includes("/api/proxy/request") };
}

async function persistCookiesIfEnabled(
  response: { headers: { key: string; value: string }[] },
  url: string,
  enableCookies: boolean,
) {
  if (!enableCookies) return;
  await persistResponseCookies(response, url);
}
