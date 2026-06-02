import type {
  GraphQLRequestConfig,
  GrpcRequestConfig,
  RequestConfig,
  RequestDraft,
  SavedRequest,
  WebSocketRequestConfig,
} from "@invoke/core";
import { emptyGrpcRequest } from "@invoke/core";
import type { AppState } from "../../../../types";

export function openSavedRequest(request: SavedRequest, store: AppState) {
  const meta = {
    id: request.id,
    name: request.name,
    collectionId: request.collectionId,
    folderId: request.folderId,
    protocol: request.protocol,
  };
  if (request.protocol === "graphql") {
    const gqlReq = request.request as GraphQLRequestConfig;
    store.setGraphqlRequest(gqlReq);
    store.setRequest({
      ...meta,
      url: gqlReq.url ?? "",
      headers: gqlReq.headers ?? [],
      auth: gqlReq.auth ?? { type: "none" },
      pathVariables: [],
    });
    store.set({
      requestTab: "graphql",
      assertionRules: gqlReq.assertions ?? [],
      extractRules: gqlReq.extractionRules ?? [],
      assertionResults: [],
    });
    return;
  }
  if (request.protocol === "websocket") {
    const wsReq = request.request as WebSocketRequestConfig;
    store.setRequest({ ...meta, pathVariables: [] });
    store.set((state) => ({
      wsSessions: state.wsSessions.map((session) =>
        session.id === state.activeWsSessionId
          ? {
              ...session,
              websocketRequest: wsReq,
              requestId: request.id,
              log: [],
              activeGqlSubscriptionId: undefined,
            }
          : session,
      ),
      websocketRequest: wsReq,
    }));
    return;
  }
  if (request.protocol === "grpc") {
    store.set({
      grpcRequest: { ...emptyGrpcRequest(), ...(request.request as GrpcRequestConfig) },
    });
    store.setRequest({ ...meta, pathVariables: [] });
    return;
  }
  const restReq = request.request as RequestConfig;
  store.setRequest({
    ...restReq,
    params: restParams(request),
    pathVariables: restReq.pathVariables ?? [],
    ...meta,
  } as Partial<RequestDraft>);
  store.set({
    requestTab: "params",
    assertionRules: restReq.assertions ?? [],
    extractRules: restReq.extractionRules ?? [],
    assertionResults: [],
  });
}

function restParams(request: SavedRequest) {
  const draft = request.request as RequestConfig;
  const params = draft.params ?? [];
  if (params.length > 0) return params;
  const queryIndex = (draft.url ?? "").indexOf("?");
  if (queryIndex === -1) return params;
  const parsed: typeof params = [];
  new URLSearchParams((draft.url ?? "").slice(queryIndex + 1)).forEach((value, key) => {
    if (key) parsed.push({ key, value, enabled: true });
  });
  return parsed.length > 0 ? parsed : params;
}
