import { useEffect, useRef } from "react";
import { Plug, RefreshCw, StopCircle, Unplug, Zap } from "lucide-react";
import { useStore } from "../../../store";
import {
  webSocketClose,
  webSocketConnect,
  webSocketPoll,
} from "../../websocket/api";
import { grpcExecute, grpcReflect, grpcServerStream } from "../../grpc/api";

export function WebSocketBar() {
  const {
    websocketRequest,
    setWebsocketRequest,
    websocketState,
    websocketConnectionId,
    set,
    addToast,
  } = useStore();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollMessages = async (id: string) => {
    try {
      const { messages, connected } = await webSocketPoll(id);
      if (!connected) {
        disconnect();
        return;
      }
      if (messages.length) {
        set((state) => ({
          websocketLog: [
            ...state.websocketLog,
            ...messages.map((message) => ({
              id: Math.random().toString(36).slice(2),
              direction: "received" as const,
              type: message.type,
              body: message.body,
              createdAt: Date.now(),
            })),
          ],
        }));
      }
    } catch {
      /* connection might be gone */
    }
  };

  const connect = async () => {
    set({ websocketState: "connecting", websocketLog: [] });
    try {
      const { connectionId, error } = await webSocketConnect(websocketRequest);
      if (error) throw new Error(error);
      set({ websocketState: "connected", websocketConnectionId: connectionId });
      pollRef.current = setInterval(() => pollMessages(connectionId), 1000);
    } catch (e) {
      set({ websocketState: "disconnected" });
      addToast("error", String(e));
    }
  };

  const disconnect = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (websocketConnectionId)
      await webSocketClose(websocketConnectionId).catch(() => {});
    set({ websocketState: "disconnected", websocketConnectionId: "" });
  };

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current);
    },
    [],
  );

  const stateColor = {
    disconnected: "bg-red-500",
    connecting: "bg-yellow-400 animate-pulse",
    connected: "bg-emerald-500",
  }[websocketState];

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className={`w-2 h-2 rounded-full shrink-0 ${stateColor}`} />
      <input
        value={websocketRequest.url}
        onChange={(e) => setWebsocketRequest({ url: e.target.value })}
        placeholder="wss://echo.websocket.org"
        disabled={websocketState === "connected"}
        className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
      />
      {websocketState === "connected" ? (
        <button onClick={disconnect} className="btn btn-danger text-xs gap-1">
          <Unplug size={12} /> Disconnect
        </button>
      ) : (
        <button
          onClick={connect}
          disabled={websocketState === "connecting"}
          className="btn btn-primary text-xs gap-1"
        >
          <Plug size={12} /> Connect
        </button>
      )}
    </div>
  );
}

export function GRPCBar() {
  const {
    grpcRequest,
    setGrpcRequest,
    grpcMethods,
    grpcStreaming,
    set,
    addToast,
  } = useStore();

  const selectedMethod = grpcMethods.find(
    (method) =>
      method.service === grpcRequest.service &&
      method.method === grpcRequest.method,
  );
  const isServerStreaming = selectedMethod?.serverStreaming ?? false;

  const reflect = async () => {
    set({ grpcStatus: "Reflecting..." });
    try {
      const { methods, error } = await grpcReflect(grpcRequest);
      if (error) throw new Error(error);
      set({
        grpcMethods: methods,
        grpcStatus: `${methods.length} methods found`,
      });
    } catch (e) {
      set({ grpcStatus: "Error" });
      addToast("error", String(e));
    }
  };

  const execute = async () => {
    if (isServerStreaming) {
      const controller = new AbortController();
      set({
        grpcStreaming: true,
        grpcStreamMessages: [],
        grpcStreamController: controller,
        grpcStatus: "Streaming...",
      });
      try {
        await grpcServerStream(grpcRequest, {
          onMessage: (message) => {
            set((state) => ({
              grpcStreamMessages: [...state.grpcStreamMessages, message],
            }));
          },
          onDone: (message) => {
            set((state) => ({
              grpcStreamMessages: [...state.grpcStreamMessages, message],
              grpcStreaming: false,
              grpcStreamController: undefined,
              grpcStatus: message.error
                ? `Error: ${message.statusMessage}`
                : `Done - ${state.grpcStreamMessages.length + 1} messages`,
            }));
          },
          signal: controller.signal,
        });
      } catch (e: unknown) {
        if ((e as Error).name !== "AbortError") addToast("error", String(e));
        set({
          grpcStreaming: false,
          grpcStreamController: undefined,
          grpcStatus: "Cancelled",
        });
      }
      return;
    }

    set({ grpcStatus: "Executing..." });
    try {
      const res = await grpcExecute(grpcRequest);
      set({
        grpcStatus: res.error ? `Error: ${res.statusMessage}` : "Done",
        response: {
          status: res.error ? 500 : 200,
          statusText: res.statusMessage ?? "OK",
          headers: res.metadata ?? [],
          body: res.bodyJson ?? "",
          timing: {
            dnsMs: 0,
            tcpMs: 0,
            tlsMs: 0,
            ttfbMs: 0,
            transferMs: 0,
            totalMs: res.durationMs ?? 0,
          },
          requestSize: 0,
          responseSize: 0,
        },
      });
    } catch (e) {
      set({ grpcStatus: "Error" });
      addToast("error", String(e));
    }
  };

  const cancelStream = () => {
    const { grpcStreamController } = useStore.getState();
    grpcStreamController?.abort();
    set({
      grpcStreaming: false,
      grpcStreamController: undefined,
      grpcStatus: "Cancelled",
    });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <input
        value={grpcRequest.address}
        onChange={(e) => setGrpcRequest({ address: e.target.value })}
        placeholder="localhost:50051"
        className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
      />
      <label className="flex items-center gap-1 text-xs text-[var(--text-2)] shrink-0 cursor-pointer">
        <input
          type="checkbox"
          checked={grpcRequest.tls ?? false}
          onChange={(e) => setGrpcRequest({ tls: e.target.checked })}
          className="accent-[var(--accent)]"
        />
        TLS
      </label>
      <button onClick={reflect} className="btn text-xs gap-1">
        <RefreshCw size={12} /> Reflect
      </button>
      {grpcStreaming ? (
        <button
          onClick={cancelStream}
          className="btn btn-danger text-xs flex items-center gap-1"
        >
          <StopCircle size={12} /> Cancel
        </button>
      ) : (
        <button
          onClick={execute}
          className="btn btn-primary text-xs flex items-center gap-1"
        >
          {isServerStreaming && <Zap size={12} />}
          Invoke
        </button>
      )}
    </div>
  );
}
