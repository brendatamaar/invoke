import {
  inferProtocol,
  mergeWithDefaults,
  type ProtocolRequestConfig,
  type RequestOptions,
  type RequestProtocol,
} from "@invoke/core";
import { useStore } from "../store";

export function applyProtocolDefaults<
  T extends { protocol?: RequestProtocol; options?: RequestOptions },
>(request: T, protocolOverride?: RequestProtocol): T {
  const protocol =
    protocolOverride ?? inferProtocol(request as unknown as ProtocolRequestConfig, "rest");
  const defaults = useStore.getState().protocolDefaults[protocol];
  return {
    ...request,
    options: mergeWithDefaults(request.options, defaults),
  };
}
