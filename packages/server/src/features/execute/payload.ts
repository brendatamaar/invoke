import type { ExecuteInput } from "../../types/index.js";
import { tlsClientConfigPayload } from "../shared/payload.js";

export function executePayload(input: ExecuteInput) {
  return {
    method: input.method,
    url: input.url,
    headers: input.headers.filter((header) => header.enabled !== false),
    body: Buffer.from(input.body),
    timeoutMs: input.timeoutMs,
    followRedirects: input.followRedirects,
    maxRedirects: input.maxRedirects,
    verifySsl: input.verifySsl,
    proxy: input.proxy,
    tlsClientConfig: tlsClientConfigPayload(input.tlsClientConfig),
  };
}
