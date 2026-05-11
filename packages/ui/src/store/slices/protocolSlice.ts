import type { AppState } from "../../types";

export type ProtocolSlice = Pick<
  AppState,
  | "graphqlFileUploads"
  | "graphqlDeferredParts"
  | "graphqlSchema"
  | "graphqlSchemaStatus"
  | "graphqlSchemaEndpoint"
  | "graphqlSchemaLastFetched"
  | "expandedGraphQLTypeNames"
  | "websocketState"
  | "websocketLog"
  | "websocketConnectionId"
  | "grpcMethods"
  | "grpcStatus"
  | "grpcStreaming"
  | "grpcStreamMessages"
  | "grpcStreamController"
>;

export function createProtocolSlice(): ProtocolSlice {
  return {
    graphqlFileUploads: [],
    graphqlDeferredParts: null,
    graphqlSchema: undefined,
    graphqlSchemaStatus: "",
    graphqlSchemaEndpoint: "",
    graphqlSchemaLastFetched: 0,
    expandedGraphQLTypeNames: [],
    websocketState: "disconnected",
    websocketLog: [],
    websocketConnectionId: "",
    grpcMethods: [],
    grpcStatus: "",
    grpcStreaming: false,
    grpcStreamMessages: [],
    grpcStreamController: undefined,
  };
}
