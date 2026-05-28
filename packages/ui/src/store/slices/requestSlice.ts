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
  | "consoleLogs"
  | "setRequest"
  | "setGraphqlRequest"
  | "setWebsocketRequest"
  | "setGrpcRequest"
  | "resetRequest"
>;

type StoreSet = Parameters<StateCreator<AppState>>[0];
type StoreGet = Parameters<StateCreator<AppState>>[1];

export function createRequestSlice(set: StoreSet, _get: StoreGet): RequestSlice {
  return {
    request: emptyRequest(),
    graphqlRequest: emptyGraphQLRequest(),
    websocketRequest: emptyWebSocketRequest(),
    grpcRequest: emptyGrpcRequest(),
    requestTab: "params",
    assertionRules: [],
    extractRules: [],
    consoleLogs: { preRequest: [], preRequestRan: false, postResponse: [], postResponseRan: false },

    setRequest: (partial) => set((state) => ({ request: { ...state.request, ...partial } })),

    setGraphqlRequest: (partial) =>
      set((state) => ({
        graphqlRequest: { ...state.graphqlRequest, ...partial },
      })),

    setWebsocketRequest: (partial) =>
      set((state) => {
        const newWsReq = { ...state.websocketRequest, ...partial };
        return {
          websocketRequest: newWsReq,
          wsSessions: state.wsSessions.map((sess) =>
            sess.id === state.activeWsSessionId ? { ...sess, websocketRequest: newWsReq } : sess,
          ),
        };
      }),

    setGrpcRequest: (partial) =>
      set((state) => ({ grpcRequest: { ...state.grpcRequest, ...partial } })),

    resetRequest: () =>
      set({
        request: emptyRequest(),
        response: undefined,
        assertionResults: [],
        consoleLogs: {
          preRequest: [],
          preRequestRan: false,
          postResponse: [],
          postResponseRan: false,
        },
        requestTab: "params",
        responseTab: "body",
      }),
  };
}
