import { v7 as uuidv7 } from "uuid";
import type { GraphQLRequestConfig, ProtocolRequestConfig, RequestConfig, RequestDraft, RequestProtocol } from "./types";
import { normalizeExtractionRules } from "./variables";

export const id = () => uuidv7();

export const emptyRequest = (): RequestDraft => ({
  method: "GET",
  url: "",
  params: [],
  headers: [],
  bodyMode: "none",
  body: "",
  auth: { type: "none" },
  timeoutMs: 30000,
  variables: [],
  assertions: [],
  extractionRules: [],
  protocol: "rest"
});

export const emptyGraphQLRequest = (): GraphQLRequestConfig => ({
  url: "",
  headers: [],
  auth: { type: "none" },
  query: "query {\n  __typename\n}",
  variables: "{}",
  operationName: "",
  timeoutMs: 30000,
  assertions: [],
  extractionRules: []
});

export function toRequestConfig(request: RequestConfig | RequestDraft): RequestConfig {
  const draft = request as RequestDraft;
  return {
    method: draft.method,
    url: draft.url,
    params: draft.params ?? [],
    headers: draft.headers ?? [],
    bodyMode: draft.bodyMode ?? "none",
    body: draft.body ?? "",
    auth: draft.auth ?? { type: "none" },
    timeoutMs: draft.timeoutMs ?? 30000,
    variables: draft.variables ?? [],
    assertions: draft.assertions ?? [],
    extractionRules: normalizeExtractionRules(draft.extractionRules),
    options: draft.options
  };
}

export function graphQLToRequestConfig(request: GraphQLRequestConfig): RequestConfig {
  const headers = [...(request.headers ?? [])];
  if (!headers.some((header) => header.enabled !== false && header.key.toLowerCase() === "content-type")) {
    headers.push({ key: "Content-Type", value: "application/json", enabled: true });
  }

  return toRequestConfig({
    ...emptyRequest(),
    method: "POST",
    url: request.url,
    headers,
    bodyMode: "json",
    body: JSON.stringify({
      query: request.query,
      variables: parseGraphQLVariables(request.variables),
      ...(request.operationName?.trim() ? { operationName: request.operationName.trim() } : {})
    }),
    auth: request.auth,
    timeoutMs: request.timeoutMs,
    options: request.options
  });
}

export function inferProtocol(request: ProtocolRequestConfig | RequestDraft, fallback: RequestProtocol = "rest"): RequestProtocol {
  if ((request as RequestDraft).protocol) return (request as RequestDraft).protocol!;
  if (isGraphQLRequestConfig(request)) return "graphql";
  return fallback;
}

export function isGraphQLRequestConfig(request: ProtocolRequestConfig | RequestDraft): request is GraphQLRequestConfig {
  const maybe = request as Partial<GraphQLRequestConfig>;
  return typeof maybe.query === "string" && typeof maybe.variables === "string" && !(request as Partial<RequestConfig>).method;
}

export function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function parseGraphQLVariables(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
