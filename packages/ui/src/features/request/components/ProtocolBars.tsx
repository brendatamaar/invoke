import { useCallback, useEffect, useRef } from "react";
import { Activity, Plug, RefreshCw, StopCircle, Unplug, X, Zap } from "lucide-react";
import { resolveWebSocketRequest } from "@invoke/core";
import type { WsPreset } from "@invoke/core";
import { useStore } from "../../../store";
import {
  webSocketClose,
  webSocketConnect,
  webSocketSend,
} from "../../websocket/api";
import { grpcExecute, grpcReflect, grpcServerStream } from "../../grpc/api";

type WsDirection = "sent" | "received" | "system";

function mapDirection(serverDirection: string): WsDirection {
  if (serverDirection === "out") return "sent";
  if (serverDirection === "system") return "system";
  return "received";
}

export function WebSocketBar() {
  const {
    websocketRequest,
    setWebsocketRequest,
    wsSessions,
    activeWsSessionId,
    environments,
    activeEnvironmentId,
    sessionVariables,
    setWsSession,
    set,
    addToast,
  } = useStore();

  const activeSession = wsSessions.find((s) => s.id === activeWsSessionId) ?? wsSessions[0];

  // Per-session EventSources and AbortControllers stored in refs (not serialisable to store)
  const eventSourcesRef = useRef(new Map<string, EventSource>());
  const controllersRef = useRef(new Map<string, AbortController>());
  // Ping RTT tracking: maps sessionId → send timestamp
  const pingTimestampRef = useRef(new Map<string, number>());

  const startEventStream = (sessionId: string, connectionId: string) => {
    const es = new EventSource(
      `/api/websocket/events?connectionId=${encodeURIComponent(connectionId)}`,
    );

    es.addEventListener("message", (e) => {
      try {
        const msg = JSON.parse(e.data) as {
          direction: string; type: string; body: string; createdAt: number;
        };
        const { websocketRequest: wsReq, wsSessions } = useStore.getState();
        const currentLog = wsSessions.find((s) => s.id === sessionId)?.log ?? [];
        const isInbound = msg.direction !== "out";

        // graphql-transport-ws: auto-reply to ping frames
        if (isInbound && wsReq.preset === "graphql-transport-ws") {
          try {
            const frame = JSON.parse(msg.body) as { type?: string };
            if (frame.type === "ping") {
              const connId = useStore.getState().wsSessions.find((s) => s.id === sessionId)?.connectionId;
              if (connId) webSocketSend(connId, JSON.stringify({ type: "pong" })).catch(() => {});
            }
          } catch { /* not valid JSON — ignore */ }
        }

        // NDJSON: split inbound text frames on newlines
        const lines =
          isInbound && wsReq.ndjsonMode && msg.type !== "binary"
            ? msg.body.split("\n").filter((l) => l.trim())
            : [msg.body];

        const newEntries = lines.map((line) => ({
          id: crypto.randomUUID(),
          direction: mapDirection(msg.direction),
          type: msg.type,
          body: line,
          createdAt: msg.createdAt || Date.now(),
        }));

        // Track last activity + compute ping RTT if a pong is pending
        const pingStart = pingTimestampRef.current.get(sessionId);
        const sessionUpdate: Record<string, unknown> = {
          log: [...currentLog, ...newEntries],
          lastActivityAt: Date.now(),
        };
        if (pingStart !== undefined) {
          sessionUpdate.latencyMs = Date.now() - pingStart;
          pingTimestampRef.current.delete(sessionId);
        }
        setWsSession(sessionId, sessionUpdate as Parameters<typeof setWsSession>[1]);
      } catch { /* malformed frame */ }
    });

    es.addEventListener("close", (e) => {
      es.close();
      eventSourcesRef.current.delete(sessionId);
      let reason = "Disconnected by server";
      try {
        const data = JSON.parse((e as MessageEvent).data ?? "{}") as { reason?: string };
        if (data.reason) reason = data.reason;
      } catch { /* ignore */ }
      const prev = useStore.getState().wsSessions.find((s) => s.id === sessionId);
      setWsSession(sessionId, {
        state: "disconnected",
        connectionId: "",
        log: [
          ...(prev?.log ?? []),
          { id: crypto.randomUUID(), direction: "system" as WsDirection, type: "info", body: reason, createdAt: Date.now() },
        ],
      });
      addToast("info", `WebSocket disconnected: ${reason}`);
      if (useStore.getState().websocketRequest.autoReconnect) {
        setTimeout(() => connect(sessionId), 2000);
      }
    });

    eventSourcesRef.current.set(sessionId, es);
  };

  const connect = async (sessionId: string) => {
    const controller = new AbortController();
    controllersRef.current.set(sessionId, controller);
    setWsSession(sessionId, { state: "connecting", log: [] });

    const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
    const { request: resolved } = resolveWebSocketRequest(websocketRequest, activeEnv, sessionVariables);

    try {
      const { connectionId, error } = await webSocketConnect(resolved, controller.signal);
      if (error) throw new Error(error);
      setWsSession(sessionId, { state: "connected", connectionId });
      startEventStream(sessionId, connectionId);
      addToast("success", "WebSocket connected");

      const wsReqState = useStore.getState().websocketRequest;

      // graphql-transport-ws preset: auto-send connection_init
      if (wsReqState.preset === "graphql-transport-ws") {
        webSocketSend(connectionId, JSON.stringify({ type: "connection_init" })).catch(() => {});
        const logNow = useStore.getState().wsSessions.find((s) => s.id === sessionId)?.log ?? [];
        setWsSession(sessionId, {
          log: [
            ...logNow,
            { id: crypto.randomUUID(), direction: "system" as WsDirection, type: "info", body: "→ connection_init sent", createdAt: Date.now() },
          ],
        });
      }

      // auto-send saved messages
      for (const msg of wsReqState.savedMessages ?? []) {
        if (msg.autoSend) {
          webSocketSend(connectionId, msg.body, msg.type === "binary").catch(() => {});
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setWsSession(sessionId, { state: "disconnected", connectionId: "" });
      addToast("error", String(e));
    } finally {
      controllersRef.current.delete(sessionId);
    }
  };

  const cancelConnect = (sessionId: string) => {
    controllersRef.current.get(sessionId)?.abort();
    controllersRef.current.delete(sessionId);
    setWsSession(sessionId, { state: "disconnected", connectionId: "" });
  };

  const disconnect = async (sessionId: string) => {
    eventSourcesRef.current.get(sessionId)?.close();
    eventSourcesRef.current.delete(sessionId);
    const sess = useStore.getState().wsSessions.find((s) => s.id === sessionId);
    if (sess?.connectionId) await webSocketClose(sess.connectionId).catch(() => {});
    setWsSession(sessionId, { state: "disconnected", connectionId: "" });
  };

  const sendPing = useCallback(async (sessionId: string) => {
    const sess = useStore.getState().wsSessions.find((s) => s.id === sessionId);
    if (!sess?.connectionId) return;
    pingTimestampRef.current.set(sessionId, Date.now());
    const body = JSON.stringify({ type: "__invoke_ping", ts: Date.now() });
    await webSocketSend(sess.connectionId, body).catch(() => {
      pingTimestampRef.current.delete(sessionId);
    });
  }, []);

  // Keyboard shortcut: Ctrl+R → connect/disconnect
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== "r") return;
      // Only intercept when focus is not in an input/textarea/select
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      const sess = useStore.getState().wsSessions.find(
        (s) => s.id === useStore.getState().activeWsSessionId,
      ) ?? useStore.getState().wsSessions[0];
      if (!sess) return;
      if (sess.state === "disconnected") connect(sess.id);
      else if (sess.state === "connected") disconnect(sess.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(
    () => () => {
      eventSourcesRef.current.forEach((es) => es.close());
    },
    [],
  );

  const state = activeSession?.state ?? "disconnected";
  const stateColor = {
    disconnected: "bg-red-500",
    connecting: "bg-yellow-400 animate-pulse",
    connected: "bg-emerald-500",
  }[state];

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className={`w-2 h-2 rounded-full shrink-0 ${stateColor}`} />
      <input
        value={websocketRequest.url}
        onChange={(e) => setWebsocketRequest({ url: e.target.value })}
        placeholder="wss://echo.websocket.org"
        disabled={state !== "disconnected"}
        className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-1.5 text-xs font-mono text-[var(--text-1)] placeholder-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
      />
      <select
        value={websocketRequest.preset ?? "none"}
        onChange={(e) => setWebsocketRequest({ preset: e.target.value as WsPreset })}
        disabled={state !== "disconnected"}
        title="Protocol preset"
        className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-xs text-[var(--text-1)] outline-none cursor-pointer shrink-0"
      >
        <option value="none">No preset</option>
        <option value="graphql-transport-ws">graphql-transport-ws</option>
      </select>
      {state === "connected" && activeSession?.latencyMs !== undefined && (
        <span
          title="Round-trip latency from last ping"
          className="flex items-center gap-1 text-2xs text-emerald-600 font-mono shrink-0"
        >
          <Activity size={10} />
          {activeSession.latencyMs}ms
        </span>
      )}
      {state === "connected" && (
        <button
          onClick={() => sendPing(activeSession.id)}
          title="Send ping and measure RTT"
          className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded shrink-0"
        >
          <Activity size={13} />
        </button>
      )}
      {state === "connected" && (
        <button onClick={() => disconnect(activeSession.id)} className="btn btn-danger text-xs gap-1">
          <Unplug size={12} /> Disconnect
        </button>
      )}
      {state === "connecting" && (
        <button onClick={() => cancelConnect(activeSession.id)} className="btn btn-danger text-xs gap-1">
          <X size={12} /> Cancel
        </button>
      )}
      {state === "disconnected" && (
        <button onClick={() => connect(activeSession.id)} className="btn btn-primary text-xs gap-1 shrink-0" title="Connect (Ctrl+R)">
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
