import { useCallback, useEffect, useMemo } from "react";
import { resolveGrpcRequest } from "@invoke/core";
import { useStore } from "../../../store";
import { useGrpcReflect } from "../useGrpcReflect";
import { runGrpcHealthCheck } from "../utils/health";
import { executeCurrentGrpcRequest } from "../utils/execution";
import {
  grpcMethodFlags,
  hasGrpcTlsLocalhostWarning,
  selectedGrpcMethod,
} from "../utils/protocolBar";
import {
  cancelGrpcExecute,
  cancelGrpcStream,
  closeGrpcStream,
} from "../utils/streamControls";

export function useGrpcBar() {
  const {
    grpcRequest,
    setGrpcRequest,
    grpcMethods,
    grpcStreaming,
    grpcExecuteController,
    grpcStreamId,
    environments,
    activeEnvironmentId,
    sessionVariables,
    grpcLatencyMs,
    set,
    addToast,
  } = useStore();
  const selectedMethod = selectedGrpcMethod(grpcMethods, grpcRequest);
  const { isServerStreaming, isClientStream } = grpcMethodFlags(selectedMethod);
  const activeEnv = environments.find((env) => env.id === activeEnvironmentId);

  const resolvedForReflect = useMemo(() => {
    if (!grpcRequest.address) return null;
    return resolveGrpcRequest(grpcRequest, activeEnv, sessionVariables).request;
  }, [grpcRequest, activeEnv, sessionVariables]);

  const { refetch: reflectRefetch } = useGrpcReflect(
    resolvedForReflect,
    grpcRequest.address ?? "",
  );

  const reflect = useCallback(async () => {
    const result = await reflectRefetch();
    if (result.error) addToast("error", String(result.error));
  }, [reflectRefetch, addToast]);

  const execute = useCallback(
    () => executeCurrentGrpcRequest(selectedMethod),
    [selectedMethod],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const tag = (event.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key === "Enter") {
        event.preventDefault();
        if (!grpcStreaming && !grpcExecuteController && !grpcStreamId) execute();
      } else if (event.key === "r") {
        event.preventDefault();
        reflect();
      } else if (event.key === "l") {
        event.preventDefault();
        set({
          grpcStreamMessages: [],
          grpcStreamSentMessages: [],
          grpcStreamReceivedMessages: [],
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    grpcStreaming,
    grpcExecuteController,
    grpcStreamId,
    execute,
    reflect,
    set,
  ]);

  return {
    grpcRequest,
    grpcLatencyMs,
    grpcStreaming,
    grpcStreamId,
    isExecuting: !!grpcExecuteController,
    isServerStreaming,
    isClientStream,
    tlsLocalhostWarning: hasGrpcTlsLocalhostWarning(grpcRequest),
    setAddress: (address: string) => {
      setGrpcRequest({ address, service: "", method: "" });
      set({ grpcMethods: [], grpcStatus: "" });
    },
    setTls: (tls: boolean) => setGrpcRequest({ tls }),
    reflect,
    healthCheck: runGrpcHealthCheck,
    execute,
    cancelStream: cancelGrpcStream,
    closeStream: closeGrpcStream,
    cancelExecute: cancelGrpcExecute,
  };
}
