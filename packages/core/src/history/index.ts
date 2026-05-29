import type {
  GraphQLRequestConfig,
  HistoryEntry,
  KeyValue,
  ProtocolRequestConfig,
  RequestConfig,
  RequestDraft,
  WebSocketRequestConfig,
} from "../types";
import { isGraphQLRequestConfig, isGrpcRequestConfig, isWebSocketRequestConfig } from "../request";

export function searchHistory(entries: HistoryEntry[], query: string, limit = 100) {
  const normalized = query.trim().toLowerCase();
  const newest = [...entries].sort((left, right) => right.createdAt - left.createdAt);
  if (!normalized) return newest.slice(0, limit);
  return newest.filter((entry) => historyHaystack(entry).includes(normalized)).slice(0, limit);
}

function historyHaystack(entry: HistoryEntry) {
  return [
    entry.id,
    entry.requestId,
    entry.collectionId,
    entry.environmentId,
    requestName(entry),
    requestMethod(entry),
    requestUrl(entry.request),
    requestBody(entry),
    requestHeaders(requestHeadersFor(entry.request)),
    responseHeaders(entry.response?.headers ?? []),
    entry.response?.body ?? "",
    entry.response?.statusText ?? "",
    String(entry.response?.status ?? ""),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function requestName(entry: HistoryEntry) {
  return (entry.request as RequestDraft).name ?? "";
}

function requestMethod(entry: HistoryEntry) {
  if (isWebSocketRequestConfig(entry.request)) return "websocket";
  if (isGrpcRequestConfig(entry.request)) return "grpc";
  return isGraphQLRequestConfig(entry.request)
    ? "graphql"
    : (entry.request as RequestConfig).method;
}

function requestBody(entry: HistoryEntry) {
  if (isGraphQLRequestConfig(entry.request)) {
    const request = entry.request as GraphQLRequestConfig;
    return [request.query, request.variables, request.operationName ?? ""].join("\n");
  }
  if (isWebSocketRequestConfig(entry.request))
    return (entry.request as WebSocketRequestConfig).message;
  if (isGrpcRequestConfig(entry.request)) return entry.request.body;
  return (entry.request as RequestConfig).body;
}

function requestUrl(request: ProtocolRequestConfig) {
  if ("url" in request) return request.url;
  if ("address" in request) return `${request.address}/${request.service}/${request.method}`;
  return "";
}

function requestHeadersFor(request: ProtocolRequestConfig) {
  if ("headers" in request) return request.headers;
  if ("metadata" in request) return request.metadata;
  return [];
}

function requestHeaders(headers: KeyValue[] = []) {
  return headers.map((header) => `${header.key}: ${header.value}`).join("\n");
}

function responseHeaders(headers: KeyValue[] = []) {
  return headers.map((header) => `${header.key}: ${header.value}`).join("\n");
}
