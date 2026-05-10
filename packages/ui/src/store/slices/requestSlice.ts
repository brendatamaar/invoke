import {
  emptyGrpcRequest,
  emptyGraphQLRequest,
  emptyRequest,
  emptyWebSocketRequest,
} from "@invoke/core";
import type { StateCreator } from "zustand";
import type { AppState } from "../../types";

export type RequestSlice = Pick<
  AppState,
  | "request"
  | "graphqlRequest"
  | "websocketRequest"
  | "grpcRequest"
  | "requestTab"
  | "assertionRules"
  | "extractRules"
  | "scriptLogs"
  | "setRequest"
  | "setGraphqlRequest"
  | "setWebsocketRequest"
  | "setGrpcRequest"
  | "resetRequest"
>;

type StoreSet = Parameters<StateCreator<AppState>>[0];

export function createRequestSlice(set: StoreSet): RequestSlice {
  return {
    request: emptyRequest(),
    graphqlRequest: emptyGraphQLRequest(),
    websocketRequest: emptyWebSocketRequest(),
    grpcRequest: emptyGrpcRequest(),
    requestTab: "params",
    assertionRules: [],
    extractRules: [],
    scriptLogs: [],

    setRequest: (partial) =>
      set((state) => ({ request: { ...state.request, ...partial } })),

    setGraphqlRequest: (partial) =>
      set((state) => ({
        graphqlRequest: { ...state.graphqlRequest, ...partial },
      })),

    setWebsocketRequest: (partial) =>
      set((state) => ({
        websocketRequest: { ...state.websocketRequest, ...partial },
      })),

    setGrpcRequest: (partial) =>
      set((state) => ({ grpcRequest: { ...state.grpcRequest, ...partial } })),

    resetRequest: () =>
      set({
        request: emptyRequest(),
        response: undefined,
        assertionResults: [],
        scriptLogs: [],
        requestTab: "params",
        responseTab: "body",
      }),
  };
}
