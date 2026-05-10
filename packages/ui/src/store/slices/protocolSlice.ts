import type { AppState } from "../../types";

export type ProtocolSlice = Pick<
  AppState,
  | "graphqlSchema"
  | "graphqlSchemaStatus"
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
    graphqlSchema: undefined,
    graphqlSchemaStatus: "",
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
