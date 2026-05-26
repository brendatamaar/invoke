import { useCallback, useEffect, useMemo, useRef } from "react";
import { resolveGrpcRequest } from "@invoke/core";
import { useStore } from "../../../store";
import { grpcReflect } from "../api";
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

  const resolvedForReflectRef = useRef(resolvedForReflect);
  resolvedForReflectRef.current = resolvedForReflect;

  const { fetchReflect, isFetching: isReflecting } = useGrpcReflect(
    resolvedForReflect,
    grpcRequest.address ?? "",
  );

  // Auto-load methods from protoset when it changes (e.g. loading from collection)
  useEffect(() => {
    const req = resolvedForReflectRef.current;
    if (!req?.protosetBase64) return;
    grpcReflect(req).then((data) => {
      if (!data.error) {
        set({ grpcMethods: data.methods, grpcStatus: `${data.methods.length} methods found` });
      }
    }).catch(() => {});
  }, [grpcRequest.protosetBase64, set]);

  const reflect = useCallback(async () => {
    try {
      const data = await fetchReflect();
      if (data.error) {
        set({ grpcMethods: [], grpcStatus: "Error" });
        addToast("error", data.error);
      } else {
        set({ grpcMethods: data.methods, grpcStatus: `${data.methods.length} methods found` });
        if (data.methods.length === 0)
          addToast("warn", "Reflection returned no methods");
      }
    } catch (error) {
      set({ grpcMethods: [], grpcStatus: "Error" });
      addToast("error", String(error));
    }
  }, [fetchReflect, addToast, set]);

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
      } else if (event.key === "R" && event.shiftKey) {
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
    isProtosetLoaded: !!grpcRequest.protosetBase64,
    tlsLocalhostWarning: hasGrpcTlsLocalhostWarning(grpcRequest),
    setAddress: (address: string) => {
      setGrpcRequest({ address, service: "", method: "" });
      set({ grpcMethods: [], grpcStatus: "" });
    },
    setTls: (tls: boolean) => setGrpcRequest({ tls }),
    isReflecting,
    reflect,
    healthCheck: runGrpcHealthCheck,
    execute,
    cancelStream: cancelGrpcStream,
    closeStream: closeGrpcStream,
    cancelExecute: cancelGrpcExecute,
  };
}
