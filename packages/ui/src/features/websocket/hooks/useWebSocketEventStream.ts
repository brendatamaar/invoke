import { useRef, type MutableRefObject } from "react";
import { useStore } from "../../../store";
import { webSocketSend } from "../api";
import {
  makeWsLogEntries,
  parseWsCloseReason,
  type WsDirection,
  type WsRelayEvent,
} from "../utils/protocolBar";

export function useWebSocketEventStream({
  pingTimestampRef,
  onAutoReconnect,
}: {
  pingTimestampRef: MutableRefObject<Map<string, number>>;
  onAutoReconnect: (sessionId: string) => void;
}) {
  const eventSourcesRef = useRef(new Map<string, EventSource>());
  const setWsSession = useStore((state) => state.setWsSession);
  const addToast = useStore((state) => state.addToast);
  const findWsSession = (sessionId: string) =>
    useStore.getState().wsSessions.find((session) => session.id === sessionId);

  const appendSystemLog = (sessionId: string, body: string) => {
    const previous = findWsSession(sessionId);
    setWsSession(sessionId, {
      log: [
        ...(previous?.log ?? []),
        {
          id: crypto.randomUUID(),
          direction: "system" as WsDirection,
          type: "info",
          body,
          createdAt: Date.now(),
        },
      ],
    });
  };

  const handleEventMessage = (sessionId: string, rawData: string) => {
    const message = JSON.parse(rawData) as WsRelayEvent;
    const { websocketRequest } = useStore.getState();
    const currentLog = findWsSession(sessionId)?.log ?? [];
    const isInbound = message.direction !== "out";

    if (isInbound && websocketRequest.preset === "graphql-transport-ws") {
      try {
        const frame = JSON.parse(message.body) as { type?: string };
        const connectionId = findWsSession(sessionId)?.connectionId;
        if (frame.type === "ping" && connectionId) {
          webSocketSend(connectionId, JSON.stringify({ type: "pong" })).catch(
            () => {},
          );
        }
      } catch {
        /* not valid JSON */
      }
    }

    const sessionUpdate: Parameters<typeof setWsSession>[1] = {
      log: [
        ...currentLog,
        ...makeWsLogEntries(message, websocketRequest.ndjsonMode ?? false),
      ],
      lastActivityAt: Date.now(),
    };
    const pingStart = pingTimestampRef.current.get(sessionId);
    if (pingStart !== undefined) {
      sessionUpdate.latencyMs = Date.now() - pingStart;
      pingTimestampRef.current.delete(sessionId);
    }
    setWsSession(sessionId, sessionUpdate);
  };

  const startEventStream = (sessionId: string, connectionId: string) => {
    const eventSource = new EventSource(
      `/api/websocket/events?connectionId=${encodeURIComponent(connectionId)}`,
    );
    eventSource.addEventListener("message", (event) => {
      try {
        handleEventMessage(sessionId, event.data);
      } catch {
        /* malformed frame */
      }
    });
    eventSource.addEventListener("close", (event) => {
      eventSource.close();
      eventSourcesRef.current.delete(sessionId);
      const reason = parseWsCloseReason(event);
      const previous = findWsSession(sessionId);
      setWsSession(sessionId, {
        state: "disconnected",
        connectionId: "",
        activeGqlSubscriptionId: undefined,
        log: [
          ...(previous?.log ?? []),
          {
            id: crypto.randomUUID(),
            direction: "system" as WsDirection,
            type: "info",
            body: reason,
            createdAt: Date.now(),
          },
        ],
      });
      addToast("info", `WebSocket disconnected: ${reason}`);
      if (useStore.getState().websocketRequest.autoReconnect) {
        setTimeout(() => onAutoReconnect(sessionId), 2000);
      }
    });
    eventSourcesRef.current.set(sessionId, eventSource);
  };

  return {
    appendSystemLog,
    findWsSession,
    startEventStream,
    closeEventStream: (sessionId: string) => {
      eventSourcesRef.current.get(sessionId)?.close();
      eventSourcesRef.current.delete(sessionId);
    },
    closeAllEventStreams: () => {
      eventSourcesRef.current.forEach((eventSource) => eventSource.close());
    },
  };
}
