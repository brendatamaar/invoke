import type { WebSocketConnectInput } from "../../types/index.js";
import { tlsClientConfigPayload } from "../shared/payload.js";

export function websocketConnectPayload(input: WebSocketConnectInput) {
  return {
    url: input.url,
    headers: input.headers.filter((header) => header.enabled !== false),
    protocols: input.protocols.map((protocol) => protocol.trim()).filter(Boolean),
    timeoutMs: input.timeoutMs,
    verifySsl: input.verifySsl,
    tlsClientConfig: tlsClientConfigPayload(input.tlsClientConfig),
  };
}
