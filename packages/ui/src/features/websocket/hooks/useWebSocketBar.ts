import { useEffect, useRef } from "react";
import { resolveWebSocketRequest } from "@invoke/core";
import { useStore } from "../../../store";
import { webSocketClose, webSocketConnect, webSocketSend } from "../api";
import { wsStateColor } from "../utils/protocolBar";
import { useWebSocketEventStream } from "./useWebSocketEventStream";

export function useWebSocketBar() {
  const {
    websocketRequest,
    setWebsocketRequest,
    wsSessions,
    activeWsSessionId,
    environments,
    activeEnvironmentId,
    sessionVariables,
    setWsSession,
    addToast,
  } = useStore();
  const activeSession =
    wsSessions.find((session) => session.id === activeWsSessionId) ?? wsSessions[0];
  const controllersRef = useRef(new Map<string, AbortController>());
  const pingTimestampRef = useRef(new Map<string, number>());
  const eventStream = useWebSocketEventStream({
    pingTimestampRef,
    onAutoReconnect: (sessionId, retryCount) => connect(sessionId, retryCount),
  });

  async function connect(sessionId: string, retryCount = 0) {
    const controller = new AbortController();
    controllersRef.current.set(sessionId, controller);
    setWsSession(sessionId, {
      state: "connecting",
      ...(retryCount === 0 ? { log: [] } : {}),
      activeGqlSubscriptionId: undefined,
    });
    const activeEnv = environments.find((env) => env.id === activeEnvironmentId);
    const { request: resolved } = resolveWebSocketRequest(
      websocketRequest,
      activeEnv,
      sessionVariables,
    );

    try {
      const { connectionId, error } = await webSocketConnect(resolved, controller.signal);
      if (error) throw new Error(error);
      setWsSession(sessionId, { state: "connected", connectionId });
      eventStream.startEventStream(sessionId, connectionId, 0);
      addToast("success", "WebSocket connected");
      const wsRequest = useStore.getState().websocketRequest;
      if (wsRequest.preset === "graphql-transport-ws") {
        webSocketSend(connectionId, JSON.stringify({ type: "connection_init" })).catch(() => {});
        eventStream.appendSystemLog(sessionId, "connection_init sent");
      }
      for (const message of wsRequest.savedMessages ?? []) {
        if (message.autoSend) {
          webSocketSend(connectionId, message.body, message.type === "binary").catch(() => {});
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setWsSession(sessionId, { state: "disconnected", connectionId: "" });
      addToast("error", String(error));
      if (retryCount > 0) {
        const { autoReconnect, reconnectDelay = 2000, reconnectMaxRetries } =
          useStore.getState().websocketRequest;
        const nextRetry = retryCount + 1;
        const canRetry = autoReconnect && (reconnectMaxRetries == null || nextRetry <= reconnectMaxRetries);
        const now = Date.now();
        const previous = eventStream.findWsSession(sessionId);
        if (canRetry) {
          const attemptsBody = reconnectMaxRetries != null
            ? `attempt ${nextRetry}/${reconnectMaxRetries}`
            : `attempt ${nextRetry}`;
          setWsSession(sessionId, {
            log: [
              ...(previous?.log ?? []),
              {
                id: crypto.randomUUID(),
                direction: "system" as const,
                type: "reconnecting" as const,
                body: attemptsBody,
                createdAt: now,
                reconnectAt: now + reconnectDelay,
              },
            ],
          });
          setTimeout(() => connect(sessionId, nextRetry), reconnectDelay);
        } else if (autoReconnect && reconnectMaxRetries != null) {
          setWsSession(sessionId, {
            log: [
              ...(previous?.log ?? []),
              {
                id: crypto.randomUUID(),
                direction: "system" as const,
                type: "info" as const,
                body: `Max reconnect attempts reached (${reconnectMaxRetries})`,
                createdAt: now,
              },
            ],
          });
        }
      }
    } finally {
      controllersRef.current.delete(sessionId);
    }
  }

  const cancelConnect = (sessionId: string) => {
    controllersRef.current.get(sessionId)?.abort();
    controllersRef.current.delete(sessionId);
    setWsSession(sessionId, { state: "disconnected", connectionId: "" });
  };

  const disconnect = async (sessionId: string) => {
    eventStream.closeEventStream(sessionId);
    const session = eventStream.findWsSession(sessionId);
    if (session?.connectionId) {
      const { websocketRequest: wsRequest } = useStore.getState();
      if (wsRequest.preset === "graphql-transport-ws" && session.activeGqlSubscriptionId) {
        await webSocketSend(
          session.connectionId,
          JSON.stringify({ type: "complete", id: session.activeGqlSubscriptionId }),
        ).catch(() => {});
      }
      await webSocketClose(session.connectionId).catch(() => {});
    }
    setWsSession(sessionId, {
      state: "disconnected",
      connectionId: "",
      activeGqlSubscriptionId: undefined,
    });
  };

  const sendPing = async (sessionId: string) => {
    const session = eventStream.findWsSession(sessionId);
    if (!session?.connectionId) return;
    pingTimestampRef.current.set(sessionId, Date.now());
    await webSocketSend(
      session.connectionId,
      JSON.stringify({ type: "__invoke_ping", ts: Date.now() }),
    ).catch(() => pingTimestampRef.current.delete(sessionId));
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;
      const tag = (event.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      event.preventDefault();
      const state = useStore.getState();
      const session =
        state.wsSessions.find((item) => item.id === state.activeWsSessionId) ?? state.wsSessions[0];
      if (session?.state === "disconnected") connect(session.id);
      else if (session?.state === "connected") disconnect(session.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });


  const state = activeSession?.state ?? "disconnected";
  return {
    websocketRequest,
    setWebsocketRequest,
    activeSession,
    state,
    stateColor: wsStateColor(state),
    connect,
    cancelConnect,
    disconnect,
    sendPing,
  };
}
