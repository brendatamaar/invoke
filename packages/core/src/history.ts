import type { GraphQLRequestConfig, HistoryEntry, KeyValue, RequestConfig, RequestDraft } from "./types";
import { isGraphQLRequestConfig } from "./request";

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
    entry.request.url,
    requestBody(entry),
    requestHeaders(entry.request.headers),
    responseHeaders(entry.response?.headers ?? []),
    entry.response?.body ?? "",
    entry.response?.statusText ?? "",
    String(entry.response?.status ?? "")
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function requestName(entry: HistoryEntry) {
  return (entry.request as RequestDraft).name ?? "";
}

function requestMethod(entry: HistoryEntry) {
  return isGraphQLRequestConfig(entry.request) ? "graphql" : (entry.request as RequestConfig).method;
}

function requestBody(entry: HistoryEntry) {
  if (isGraphQLRequestConfig(entry.request)) {
    const request = entry.request as GraphQLRequestConfig;
    return [request.query, request.variables, request.operationName ?? ""].join("\n");
  }
  return (entry.request as RequestConfig).body;
}

function requestHeaders(headers: KeyValue[] = []) {
  return headers.map((header) => `${header.key}: ${header.value}`).join("\n");
}

function responseHeaders(headers: KeyValue[] = []) {
  return headers.map((header) => `${header.key}: ${header.value}`).join("\n");
}
