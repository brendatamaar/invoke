import { emptyGrpcRequest } from "../request";
import type { GrpcRequestConfig } from "../types";

export function parseGrpcurl(command: string): Partial<GrpcRequestConfig> | null {
  const tokens =
    command.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(stripQuotes) ?? [];
  if (!tokens.length || tokens[0] !== "grpcurl") return null;

  const request = emptyGrpcRequest();
  let plaintext = false;

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "-plaintext") {
      plaintext = true;
    } else if (token === "-insecure") {
      request.tls = true;
    } else if (token === "-d" || token === "--data" || token === "-data") {
      request.body = tokens[++i] ?? "{}";
    } else if (token === "-rpc-header" || token === "-H") {
      const raw = tokens[++i] ?? "";
      const [key, ...rest] = raw.split(":");
      if (key.trim()) {
        request.metadata.push({ key: key.trim(), value: rest.join(":").trim(), enabled: true });
      }
    } else if (token === "-authority") {
      request.metadata.push({ key: ":authority", value: tokens[++i] ?? "", enabled: true });
    } else if (token === "-connect-timeout") {
      const secs = parseFloat(tokens[++i] ?? "30");
      request.timeoutMs = Math.round(secs * 1000);
    } else if (token === "-max-time") {
      const secs = parseFloat(tokens[++i] ?? "30");
      request.timeoutMs = Math.round(secs * 1000);
    } else if (token === "-import-path" || token === "-proto" || token === "-protoset") {
      i += 1; // skip the path value, not applicable to in-app config
    } else if (!token.startsWith("-")) {
      // Positional args: first is address, second is full method
      if (!request.address) {
        request.address = token;
      } else {
        const parts = token.split("/");
        request.method = parts.pop() ?? "";
        request.service = parts.join("/");
      }
    }
  }

  request.tls = !plaintext;

  // Extract auth from metadata
  const authMeta = request.metadata.find(
    (m) => m.key.toLowerCase() === "authorization",
  );
  if (authMeta?.value.toLowerCase().startsWith("bearer ")) {
    request.auth = { type: "bearer", token: authMeta.value.slice(7) };
    request.metadata = request.metadata.filter((m) => m !== authMeta);
  }

  return request;
}

function stripQuotes(value: string) {
  return value.replace(/^["']|["']$/g, "");
}
