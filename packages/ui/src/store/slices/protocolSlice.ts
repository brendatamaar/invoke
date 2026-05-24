import { emptyWebSocketRequest } from "@invoke/core";
import type { WebSocketRequestConfig } from "@invoke/core";
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
  | "grpcResponse"
  | "grpcExecuteController"
  | "grpcAssertionResults"
  | "grpcStreamId"
  | "grpcStreamSentMessages"
  | "grpcStreamReceivedMessages"
  | "grpcLatencyMs"
  | "grpcDeadlineEnd"
>;

export function makeWsSession(
  label: string,
  websocketRequest?: WebSocketRequestConfig,
  requestId?: string,
): WsSession {
  return {
    id: crypto.randomUUID(),
    connectionId: "",
    state: "disconnected",
    log: [],
    label,
    websocketRequest: websocketRequest ?? emptyWebSocketRequest(),
    requestId,
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
