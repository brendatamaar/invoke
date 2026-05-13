import {
  emptyGraphQLRequest,
  emptyGrpcRequest,
  emptyRequest,
  emptyWebSocketRequest,
} from "@invoke/core";

export function newRestRequest() {
  return emptyRequest();
}

export function newGraphQLRequest() {
  return emptyGraphQLRequest();
}

export function newWebSocketRequest() {
  return emptyWebSocketRequest();
}

export function newGrpcRequest() {
  return emptyGrpcRequest();
}
