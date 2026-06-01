import { v7 as uuidv7 } from "uuid";
import type {
  GrpcRequestConfig,
  GraphQLRequestConfig,
  ProtocolNetworkDefaults,
  ProtocolRequestConfig,
  RequestConfig,
  RequestOptions,
  RequestDraft,
  RequestProtocol,
  WebSocketRequestConfig,
} from "../types";
import { NETWORK_OPTION_KEYS } from "../types/settings";
import { normalizeExtractionRules } from "../variables";

export const id = () => uuidv7();

export function mergeWithDefaults(
  reqOptions: RequestOptions | undefined,
  defaults: ProtocolNetworkDefaults,
): RequestOptions {
  const requestOptions = reqOptions ?? {};
  const merged: RequestOptions = {
    ...defaults.options,
    ...requestOptions,
    tlsClientConfig: {
      ...(defaults.options.tlsClientConfig ?? {}),
      ...(requestOptions.tlsClientConfig ?? {}),
    },
  };

  const proxy = requestOptions.proxy ?? defaults.options.proxy;
  if (proxy) merged.proxy = { ...proxy };
  else delete merged.proxy;

  return merged;
}

export function stripNetworkOptions(options?: RequestOptions): RequestOptions {
  const cleaned: RequestOptions = { ...(options ?? {}) };
  for (const key of NETWORK_OPTION_KEYS) delete cleaned[key];
  return cleaned;
}

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
  pathVariables: [],
  assertions: [],
  extractionRules: [],
  options: {},
  scripts: { preRequest: "", postResponse: "" },
  protocol: "rest",
});

export const emptyGraphQLRequest = (): GraphQLRequestConfig => ({
  protocol: "graphql",
  url: "",
  headers: [],
  auth: { type: "none" },
  query: "query {\n  __typename\n}",
  variables: "{}",
  operationName: "",
  timeoutMs: 30000,
  assertions: [],
  extractionRules: [],
  options: {},
  scripts: { preRequest: "", postResponse: "" },
});

export const emptyWebSocketRequest = (): WebSocketRequestConfig => ({
  url: "",
  protocols: "",
  headers: [],
  auth: { type: "none" },
  messageMode: "text",
  message: "",
  timeoutMs: 30000,
  variables: [],
  options: {},
  scripts: { preRequest: "", postResponse: "" },
  savedMessages: [],
  autoReconnect: false,
  reconnectDelay: 2000,
  reconnectMaxRetries: undefined,
  preset: "none",
  presetQuery: "",
  presetVariables: "{}",
  ndjsonMode: false,
  origin: "",
});

export const emptyGrpcRequest = (): GrpcRequestConfig => ({
  address: "",
  service: "",
  method: "",
  metadata: [],
  body: "{}",
  tls: true,
  timeoutMs: 30000,
  auth: { type: "none" },
  variables: [],
  assertions: [],
  extractionRules: [],
  options: {},
  scripts: { preRequest: "", postResponse: "" },
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
    pathVariables: draft.pathVariables ?? [],
    assertions: draft.assertions ?? [],
    extractionRules: normalizeExtractionRules(draft.extractionRules),
    options: draft.options,
    scripts: draft.scripts ?? { preRequest: "", postResponse: "" },
  };
}

export function graphQLToRequestConfig(request: GraphQLRequestConfig): RequestConfig {
  const useGet = request.httpMethod === "GET";
  const contentType = request.contentType ?? "application/json";

  if (useGet) {
    const parsedVars = parseGraphQLVariables(request.variables);
    const params: { key: string; value: string; enabled: true }[] = [
      { key: "query", value: request.query ?? "", enabled: true },
    ];
    if (parsedVars && Object.keys(parsedVars).length > 0)
      params.push({ key: "variables", value: JSON.stringify(parsedVars), enabled: true });
    if (request.operationName?.trim())
      params.push({ key: "operationName", value: request.operationName.trim(), enabled: true });

    return toRequestConfig({
      ...emptyRequest(),
      method: "GET",
      url: request.url,
      params,
      headers: [...(request.headers ?? [])],
      bodyMode: "none",
      body: "",
      auth: request.auth,
      timeoutMs: request.timeoutMs,
      options: request.options,
      scripts: request.scripts,
    });
  }

  const headers = [...(request.headers ?? [])];
  if (
    !headers.some(
      (header) => header.enabled !== false && header.key.toLowerCase() === "content-type",
    )
  ) {
    headers.push({ key: "Content-Type", value: contentType, enabled: true });
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
      ...(request.operationName?.trim() ? { operationName: request.operationName.trim() } : {}),
    }),
    auth: request.auth,
    timeoutMs: request.timeoutMs,
    options: request.options,
    scripts: request.scripts,
  });
}

export function inferProtocol(
  request: ProtocolRequestConfig | RequestDraft,
  fallback: RequestProtocol = "rest",
): RequestProtocol {
  if ((request as RequestDraft).protocol) return (request as RequestDraft).protocol!;
  if (isGraphQLRequestConfig(request)) return "graphql";
  if (isWebSocketRequestConfig(request)) return "websocket";
  if (isGrpcRequestConfig(request)) return "grpc";
  return fallback;
}

export function isGraphQLRequestConfig(
  request: ProtocolRequestConfig | RequestDraft,
): request is GraphQLRequestConfig {
  const maybe = request as Partial<GraphQLRequestConfig>;
  // Prefer explicit protocol discriminator
  if ((maybe as { protocol?: string }).protocol === "graphql") return true;
  // Structural fallback for legacy data
  return (
    typeof maybe.query === "string" &&
    typeof maybe.variables === "string" &&
    !(request as Partial<RequestConfig>).method
  );
}

export function isWebSocketRequestConfig(
  request: ProtocolRequestConfig | RequestDraft,
): request is WebSocketRequestConfig {
  const maybe = request as Partial<WebSocketRequestConfig>;
  return (
    typeof maybe.messageMode === "string" &&
    typeof maybe.message === "string" &&
    !(request as Partial<RequestConfig>).method
  );
}

export function isGrpcRequestConfig(
  request: ProtocolRequestConfig | RequestDraft,
): request is GrpcRequestConfig {
  const maybe = request as Partial<GrpcRequestConfig>;
  return (
    typeof maybe.address === "string" &&
    typeof maybe.service === "string" &&
    typeof maybe.method === "string"
  );
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
