import type {
  ExecuteResponse,
  GrpcExecuteResponse,
  GrpcMethodInfo,
  GrpcRequestConfig,
} from "@invoke/core";

export function grpcResponseToExecuteResponse(response: GrpcExecuteResponse): ExecuteResponse {
  return {
    status: response.error ? 500 : 200,
    statusText: response.statusMessage ?? "OK",
    headers: [...(response.metadata ?? []), ...(response.trailers ?? [])],
    body: response.bodyJson ?? "",
    timing: {
      dnsMs: 0,
      tcpMs: 0,
      tlsMs: 0,
      ttfbMs: 0,
      transferMs: 0,
      totalMs: response.durationMs ?? 0,
    },
    requestSize: 0,
    responseSize: 0,
  };
}

export function selectedGrpcMethod(methods: GrpcMethodInfo[], request: GrpcRequestConfig) {
  return methods.find(
    (method) => method.service === request.service && method.method === request.method,
  );
}

export function grpcMethodFlags(method?: GrpcMethodInfo) {
  return {
    isServerStreaming: (method?.serverStreaming ?? false) && !(method?.clientStreaming ?? false),
    isClientStream: method?.clientStreaming ?? false,
  };
}

export function hasGrpcTlsLocalhostWarning(request: GrpcRequestConfig) {
  return request.tls && /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(request.address ?? "");
}
