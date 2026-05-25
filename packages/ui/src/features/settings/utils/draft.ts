import type {
  DefaultProtocolOptions,
  ProtocolNetworkDefaults,
  RequestOptions,
} from "@invoke/core";
import type { GeneralDraft } from "../../../types";
import { getStoredTheme } from "./theme";

export function buildStatItems({
  storageStats,
  collectionsCount,
  requestsCount,
  historyCount,
  environmentsCount,
  flowsCount,
  foldersCount,
}: {
  storageStats: Record<string, number>;
  collectionsCount: number;
  requestsCount: number;
  historyCount: number;
  environmentsCount: number;
  flowsCount: number;
  foldersCount: number;
}) {
  return [
    { label: "Collections", value: storageStats.collections ?? collectionsCount },
    { label: "Requests", value: storageStats.requests ?? requestsCount },
    { label: "History", value: storageStats.history ?? historyCount },
    { label: "Environments", value: storageStats.environments ?? environmentsCount },
    { label: "Flows", value: storageStats.flows ?? flowsCount },
    { label: "Folders", value: storageStats.folders ?? foldersCount },
  ];
}

export function buildGeneralDraft(
  uiFontSize: number,
  editorWordWrap: boolean,
): GeneralDraft {
  return {
    theme: getStoredTheme(),
    uiFontSize,
    editorWordWrap,
  };
}

export function cloneOptions(options?: RequestOptions): RequestOptions {
  const next: RequestOptions = { ...(options ?? {}) };
  if (options?.proxy) next.proxy = { ...options.proxy };
  if (options?.tlsClientConfig) {
    next.tlsClientConfig = { ...options.tlsClientConfig };
  }
  return next;
}

export function buildProtocolDraft(source: {
  options?: RequestOptions;
}): ProtocolNetworkDefaults {
  return {
    options: cloneOptions(source.options),
  };
}

export function cloneProtocolDefaults(
  defaults: DefaultProtocolOptions,
): DefaultProtocolOptions {
  return {
    rest: buildProtocolDraft(defaults.rest),
    graphql: buildProtocolDraft(defaults.graphql),
    websocket: buildProtocolDraft(defaults.websocket),
    grpc: buildProtocolDraft(defaults.grpc),
  };
}
