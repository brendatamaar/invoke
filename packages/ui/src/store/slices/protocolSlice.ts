import type { AppState, WsSession } from "../../types";

export const WS_NEW_KEY = "__new__";
export function wsRequestKey(id?: string): string {
  return id ?? WS_NEW_KEY;
}

export type ProtocolSlice = Pick<
  AppState,
  | "graphqlFileUploads"
  | "graphqlDeferredParts"
  | "graphqlSchema"
  | "graphqlSchemaStatus"
  | "graphqlSchemaEndpoint"
  | "graphqlSchemaLastFetched"
  | "expandedGraphQLTypeNames"
  | "wsSessionsByRequestId"
  | "activeWsSessionIdByRequestId"
  | "grpcMethods"
  | "grpcStatus"
  | "grpcStreaming"
  | "grpcStreamMessages"
  | "grpcStreamController"
  | "grpcResponse"
  | "grpcExecuteController"
  | "grpcAssertionResults"
  | "grpcStreamId"
  | "grpcStreamSentMessages"
  | "grpcStreamReceivedMessages"
  | "grpcLatencyMs"
  | "grpcDeadlineEnd"
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
    wsSessionsByRequestId: { [WS_NEW_KEY]: [initial] },
    activeWsSessionIdByRequestId: { [WS_NEW_KEY]: initial.id },
    grpcMethods: [],
    grpcStatus: "",
    grpcStreaming: false,
    grpcStreamMessages: [],
    grpcStreamController: undefined,
    grpcResponse: undefined,
    grpcExecuteController: undefined,
    grpcAssertionResults: [],
    grpcStreamId: undefined,
    grpcStreamSentMessages: [],
    grpcStreamReceivedMessages: [],
    grpcLatencyMs: undefined,
    grpcDeadlineEnd: undefined,
  };
}
