import type {
  GraphQLRequestConfig,
  GrpcRequestConfig,
  RequestConfig,
  RequestDraft,
  SavedRequest,
  WebSocketRequestConfig,
} from "@invoke/core";
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
    store.setGraphqlRequest(request.request as GraphQLRequestConfig);
    store.setRequest(meta);
    store.set({ requestTab: "graphql" });
    return;
  }
  if (request.protocol === "websocket") {
    const wsReq = request.request as WebSocketRequestConfig;
    store.setRequest(meta);
    store.set((state) => ({
      wsSessions: state.wsSessions.map((session) =>
        session.id === state.activeWsSessionId
          ? { ...session, websocketRequest: wsReq, requestId: request.id, log: [] }
          : session,
      ),
      websocketRequest: wsReq,
    }));
    return;
  }
  if (request.protocol === "grpc") {
    store.setGrpcRequest(request.request as GrpcRequestConfig);
    store.setRequest(meta);
    return;
  }
  store.setRequest({
    ...request.request,
    params: restParams(request),
    ...meta,
  } as Partial<RequestDraft>);
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
