import type {
  GrpcExecuteResponse,
  GrpcMethodInfo,
  GrpcRequestConfig,
  GrpcStreamMessage,
} from "@invoke/core";
import { readJson } from "../../lib/http";
import { applyProtocolDefaults } from "../../lib/protocolDefaults";

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

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      const dataLine = event
        .split("\n")
        .find((line) => line.startsWith("data:"));
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
  signal?: AbortSignal,
): Promise<GrpcExecuteResponse> {
  const response = await fetch("/api/grpc/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...buildGrpcPayload(request),
      fullMethod: grpcFullMethod(request),
      bodyJson: request.body,
    }),
    signal,
  });
  return readJson<GrpcExecuteResponse>(response);
}

function buildGrpcPayload(req: GrpcRequestConfig) {
  req = applyProtocolDefaults(req, "grpc");
  return {
    address: req.address,
    tls: req.tls,
    timeoutMs: req.timeoutMs,
    metadata: req.metadata,
    verifySsl: req.options?.verifySsl ?? true,
    tlsClientConfig: req.options?.tlsClientConfig,
    auth: req.auth,
    protosetBase64: req.protosetBase64,
    compression: req.compression,
  };
}

export async function grpcStreamOpen(
  request: GrpcRequestConfig,
): Promise<{ streamId?: string; error?: string }> {
  const response = await fetch("/api/grpc/stream/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...buildGrpcPayload(request),
      fullMethod: grpcFullMethod(request),
      bodyJson: request.body,
    }),
  });
  return readJson<{ streamId?: string; error?: string }>(response);
}

export async function grpcStreamSend(
  streamId: string,
  bodyJson: string,
): Promise<{ error?: string }> {
  const response = await fetch("/api/grpc/stream/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ streamId, bodyJson }),
  });
  return readJson<{ error?: string }>(response);
}

export async function grpcStreamClose(streamId: string): Promise<{
  bodyJson?: string;
  error?: string;
  statusCode?: number;
  statusMessage?: string;
  trailers?: any[];
  durationMs?: number;
}> {
  const response = await fetch("/api/grpc/stream/close", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ streamId }),
  });
  return readJson(response);
}

export function grpcStreamEvents(
  streamId: string,
  handlers: {
    onMessage: (message: GrpcStreamMessage) => void;
    onDone: (message: GrpcStreamMessage) => void;
    signal?: AbortSignal;
  },
): Promise<void> {
  return fetch(
    `/api/grpc/stream/events?streamId=${encodeURIComponent(streamId)}`,
    {
      signal: handlers.signal,
    },
  ).then(async (response) => {
    if (!response.ok || !response.body) throw new Error(await response.text());
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const event of events) {
        const dataLine = event.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        try {
          const message = JSON.parse(
            dataLine.slice(5).trimStart(),
          ) as GrpcStreamMessage;
          if (message.done) handlers.onDone(message);
          else handlers.onMessage(message);
        } catch {
          /* skip */
        }
      }
    }
  });
}

function grpcFullMethod(req: GrpcRequestConfig) {
  if (req.method.trim().startsWith("/")) return req.method.trim();
  return `/${req.service.trim()}/${req.method.trim()}`;
}
