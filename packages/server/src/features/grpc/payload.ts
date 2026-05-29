import type { GrpcAuthInput, GrpcReflectInput, ServerHeaderInput } from "../../types/index.js";
import { tlsClientConfigPayload } from "../shared/payload.js";

function authToMetadata(auth: GrpcAuthInput | undefined): ServerHeaderInput[] {
  if (!auth || auth.type === "none") return [];
  switch (auth.type) {
    case "bearer":
      return auth.token ? [{ key: "authorization", value: `Bearer ${auth.token}` }] : [];
    case "basic":
      return [
        {
          key: "authorization",
          value: `Basic ${Buffer.from(`${auth.username ?? ""}:${auth.password ?? ""}`).toString("base64")}`,
        },
      ];
    case "api-key":
      if (auth.apiKeyIn !== "query" && auth.apiKeyName && auth.apiKeyValue) {
        return [{ key: auth.apiKeyName, value: auth.apiKeyValue }];
      }
      return [];
    case "oauth2":
      return auth.accessToken
        ? [{ key: "authorization", value: `Bearer ${auth.accessToken}` }]
        : [];
    default:
      return [];
  }
}

export function grpcPayload(input: GrpcReflectInput) {
  const authHeaders = authToMetadata(input.auth);
  return {
    address: input.address,
    tls: input.tls,
    timeoutMs: input.timeoutMs,
    metadata: [...authHeaders, ...input.metadata.filter((header) => header.enabled !== false)],
    verifySsl: input.verifySsl,
    allowPrivate: input.allowPrivateAddresses ?? true,
    tlsClientConfig: tlsClientConfigPayload(input.tlsClientConfig),
    protosetBase64: input.protosetBase64,
  };
}
