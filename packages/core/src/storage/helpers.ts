import type {
  Folder,
  ProtocolRequestConfig,
  RequestConfig,
  RequestDraft,
} from "../types";
import {
  isGraphQLRequestConfig,
  isGrpcRequestConfig,
  isWebSocketRequestConfig,
  toRequestConfig,
} from "../request";

export const HISTORY_LIMIT = 10000;

export function schemaCacheKey(endpoint: string) {
  return `graphql-schema:${endpoint.trim()}`;
}

export function collectFolderIds(folders: Folder[], rootId: string) {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (
        folder.parentFolderId &&
        ids.has(folder.parentFolderId) &&
        !ids.has(folder.id)
      ) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }
  return [...ids];
}

export function normalizeSavedRequest(
  request: ProtocolRequestConfig | RequestDraft,
): ProtocolRequestConfig {
  if (
    isGraphQLRequestConfig(request) ||
    isWebSocketRequestConfig(request) ||
    isGrpcRequestConfig(request)
  ) {
    return request as ProtocolRequestConfig;
  }
  return toRequestConfig(request as RequestConfig | RequestDraft);
}
