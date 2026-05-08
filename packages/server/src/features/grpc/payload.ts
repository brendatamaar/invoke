import type { GrpcReflectInput } from "../../types/index.js";
import { tlsClientConfigPayload } from "../shared/payload.js";

export function grpcPayload(input: GrpcReflectInput) {
  return {
    address: input.address,
    tls: input.tls,
    timeoutMs: input.timeoutMs,
    metadata: input.metadata.filter((header) => header.enabled !== false),
    verifySsl: input.verifySsl,
    tlsClientConfig: tlsClientConfigPayload(input.tlsClientConfig),
  };
}
