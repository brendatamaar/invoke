import type { GrpcMethodInfo } from "@invoke/core";
import { grpcMethodFlags } from "./protocolBar";
import { resolveGrpcWithPreRequest } from "./resolveRequest";
import { openGrpcClientStream } from "./clientStreamExecution";
import { runGrpcServerStream } from "./serverStreamExecution";
import { runGrpcUnary } from "./unaryExecution";

export async function executeCurrentGrpcRequest(selectedMethod?: GrpcMethodInfo) {
  const { request, sessionVariables } = await resolveGrpcWithPreRequest();
  const { isServerStreaming, isClientStream } = grpcMethodFlags(selectedMethod);
  if (isServerStreaming) {
    await runGrpcServerStream(request);
    return;
  }
  if (isClientStream) {
    await openGrpcClientStream(request, selectedMethod);
    return;
  }
  await runGrpcUnary(request, sessionVariables);
}
