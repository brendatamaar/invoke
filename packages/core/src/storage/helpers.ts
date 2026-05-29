import type { Folder, ProtocolRequestConfig, RequestConfig, RequestDraft } from "../types";
import {
  isGraphQLRequestConfig,
  isGrpcRequestConfig,
  isWebSocketRequestConfig,
  toRequestConfig,
} from "../request";
import { stripNetworkOptionsFromProtocolRequest } from "./migrations";

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
      if (folder.parentFolderId && ids.has(folder.parentFolderId) && !ids.has(folder.id)) {
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
    return stripNetworkOptionsFromProtocolRequest(request as ProtocolRequestConfig);
  }
  return stripNetworkOptionsFromProtocolRequest(
    toRequestConfig(request as RequestConfig | RequestDraft),
  );
}
