import type { TlsClientConfigInput } from "../../types/index.js";

export function tlsClientConfigPayload(input?: TlsClientConfigInput) {
  if (!input) return undefined;
  const hasValue = [
    input.clientCertPem,
    input.clientKeyPem,
    input.caCertPem,
    input.serverName,
  ].some((value) => value.trim() !== "");
  if (!hasValue) return undefined;
  return {
    clientCertPem: Buffer.from(input.clientCertPem),
    clientKeyPem: Buffer.from(input.clientKeyPem),
    caCertPem: Buffer.from(input.caCertPem),
    serverName: input.serverName,
  };
}
