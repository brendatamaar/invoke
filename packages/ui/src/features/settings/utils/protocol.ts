import type { RequestProtocol } from "@invoke/core";

export function isRedirectProtocol(protocol: RequestProtocol) {
  return protocol === "rest" || protocol === "graphql";
}

export function hasAdvancedTimeouts(protocol: RequestProtocol) {
  return protocol === "rest" || protocol === "graphql" || protocol === "grpc";
}
