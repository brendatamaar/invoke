import type {
  GrpcExecuteResponse,
  GrpcMethodInfo,
  GrpcRequestConfig,
  GrpcStreamMessage,
} from "@invoke/core";
import { readJson } from "../../lib/http";

export async function grpcServerStream(
  request: GrpcRequestConfig,
  handlers: {
    onMessage: (message: GrpcStreamMessage) => void;
    onDone: (message: GrpcStreamMessage) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  const payload = {
    ...buildGrpcPayload(request),
    fullMethod: grpcFullMethod(request),
    bodyJson: request.body,
  };
  const response = await fetch("/api/grpc/server-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: handlers.signal,
  });
  if (!response.ok || !response.body) throw new Error(await response.text());

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
      if (!dataLine) continue;
      try {
        const message = JSON.parse(
          dataLine.slice(5).trimStart(),
        ) as GrpcStreamMessage;
        if (message.done) {
          handlers.onDone(message);
        } else {
          handlers.onMessage(message);
        }
      } catch {
        /* skip malformed */
      }
    }
  }
}

export async function grpcReflect(
  request: GrpcRequestConfig,
): Promise<{ methods: GrpcMethodInfo[]; error?: string }> {
  const response = await fetch("/api/grpc/reflect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGrpcPayload(request)),
  });
  return readJson<{ methods: GrpcMethodInfo[]; error?: string }>(response);
}

export async function grpcExecute(
  request: GrpcRequestConfig,
): Promise<GrpcExecuteResponse> {
  const response = await fetch("/api/grpc/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...buildGrpcPayload(request),
      fullMethod: grpcFullMethod(request),
      bodyJson: request.body,
    }),
  });
  return readJson<GrpcExecuteResponse>(response);
}

function buildGrpcPayload(req: GrpcRequestConfig) {
  return {
    address: req.address,
    tls: req.tls,
    timeoutMs: req.timeoutMs,
    metadata: req.metadata,
    verifySsl: req.options?.verifySsl ?? true,
    tlsClientConfig: req.options?.tlsClientConfig,
  };
}

function grpcFullMethod(req: GrpcRequestConfig) {
  if (req.method.trim().startsWith("/")) return req.method.trim();
  return `/${req.service.trim()}/${req.method.trim()}`;
}
