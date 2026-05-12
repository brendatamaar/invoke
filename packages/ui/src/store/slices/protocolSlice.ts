import type { AppState, WsSession } from "../../types";

export type ProtocolSlice = Pick<
  AppState,
  | "graphqlFileUploads"
  | "graphqlDeferredParts"
  | "graphqlSchema"
  | "graphqlSchemaStatus"
  | "graphqlSchemaEndpoint"
  | "graphqlSchemaLastFetched"
  | "expandedGraphQLTypeNames"
  | "wsSessions"
  | "activeWsSessionId"
  | "grpcMethods"
  | "grpcStatus"
  | "grpcStreaming"
  | "grpcStreamMessages"
  | "grpcStreamController"
>;

export function makeWsSession(label: string): WsSession {
  return {
    id: crypto.randomUUID(),
    connectionId: "",
    state: "disconnected",
    log: [],
    label,
  };
}

export function createProtocolSlice(): ProtocolSlice {
  const initial = makeWsSession("Session 1");
  return {
    graphqlFileUploads: [],
    graphqlDeferredParts: null,
    graphqlSchema: undefined,
    graphqlSchemaStatus: "",
    graphqlSchemaEndpoint: "",
    graphqlSchemaLastFetched: 0,
    expandedGraphQLTypeNames: [],
    wsSessions: [initial],
    activeWsSessionId: initial.id,
    grpcMethods: [],
    grpcStatus: "",
    grpcStreaming: false,
    grpcStreamMessages: [],
    grpcStreamController: undefined,
  };
}
