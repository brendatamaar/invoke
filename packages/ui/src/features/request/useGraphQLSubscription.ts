import { useRef, useState } from "react";
import { webSocketClose, webSocketPoll, webSocketSend } from "../websocket/api";
import { readJson } from "../../lib/http";
import type { KeyValue } from "@invoke/core";

export interface GQLSubMessage {
  id: string;
  kind: "data" | "error" | "system" | "complete";
  payload: string;
  createdAt: number;
}

export type GQLSubState =
  | "idle"
  | "connecting"
  | "subscribed"
  | "complete"
  | "error";

export interface SubscribeOptions {
  url: string;
  headers: KeyValue[];
  query: string;
  variables?: string;
  operationName?: string;
}

export function useGraphQLSubscription() {
  const [state, setState] = useState<GQLSubState>("idle");
  const [messages, setMessages] = useState<GQLSubMessage[]>([]);
  const connIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const subIdRef = useRef("1");
  const ackReceivedRef = useRef(false);

  function addMessage(kind: GQLSubMessage["kind"], payload: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        kind,
        payload,
        createdAt: Date.now(),
      },
    ]);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function terminate(connId: string | null, nextState: GQLSubState) {
    stopPolling();
    if (connId) {
      try {
        await webSocketClose(connId);
      } catch {
        /* ignore */
      }
      connIdRef.current = null;
    }
    setState(nextState);
  }

  async function subscribe(opts: SubscribeOptions) {
    if (state === "connecting" || state === "subscribed") return;
    setState("connecting");
    setMessages([]);
    ackReceivedRef.current = false;
    subIdRef.current = `sub_${Math.random().toString(36).slice(2)}`;

    const wsUrl = opts.url.replace(/^(https?):\/\//, (_, proto: string) =>
      proto === "https" ? "wss://" : "ws://",
    );

    try {
      const res = await fetch("/api/websocket/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wsUrl,
          headers: (opts.headers ?? []).filter(
            (h) => h.enabled !== false && h.key.trim(),
          ),
          protocols: ["graphql-transport-ws"],
          timeoutMs: 30000,
          verifySsl: true,
        }),
      });
      const { connectionId, error: connErr } = await readJson<{
        connectionId: string;
        error?: string;
      }>(res);
      if (connErr) throw new Error(connErr);
      connIdRef.current = connectionId;

      addMessage("system", "Connected");
      await webSocketSend(
        connectionId,
        JSON.stringify({ type: "connection_init" }),
      );

      const poll = async () => {
        const id = connIdRef.current;
        if (!id) {
          stopPolling();
          return;
        }
        try {
          const { messages: raw, connected } = await webSocketPoll(id);
          if (!connected) {
            addMessage("system", "Disconnected by server");
            terminate(null, "complete");
            return;
          }
          for (const msg of raw) {
            let parsed: { type: string; id?: string; payload?: unknown };
            try {
              parsed = JSON.parse(msg.body) as typeof parsed;
            } catch {
              continue;
            }

            switch (parsed.type) {
              case "connection_ack":
                if (!ackReceivedRef.current) {
                  ackReceivedRef.current = true;
                  addMessage("system", "Acknowledged");
                  let vars: unknown = {};
                  try {
                    vars = JSON.parse(opts.variables ?? "{}");
                  } catch {
                    /* */
                  }
                  const payload: Record<string, unknown> = {
                    query: opts.query,
                    variables: vars,
                  };
                  if (opts.operationName)
                    payload.operationName = opts.operationName;
                  await webSocketSend(
                    id,
                    JSON.stringify({
                      type: "subscribe",
                      id: subIdRef.current,
                      payload,
                    }),
                  );
                  setState("subscribed");
                }
                break;
              case "next":
                if (parsed.id === subIdRef.current)
                  addMessage("data", JSON.stringify(parsed.payload, null, 2));
                break;
              case "error":
                if (parsed.id === subIdRef.current) {
                  addMessage("error", JSON.stringify(parsed.payload, null, 2));
                  terminate(id, "error");
                }
                break;
              case "complete":
                if (parsed.id === subIdRef.current) {
                  addMessage("complete", "Subscription completed by server");
                  terminate(id, "complete");
                }
                break;
              case "ping":
                await webSocketSend(id, JSON.stringify({ type: "pong" })).catch(
                  () => {},
                );
                break;
            }
          }
        } catch {
          /* poll failed — connection may be gone */
        }
      };

      pollRef.current = setInterval(poll, 500);
    } catch (e) {
      addMessage("error", e instanceof Error ? e.message : String(e));
      terminate(connIdRef.current, "error");
    }
  }

  async function unsubscribe() {
    const id = connIdRef.current;
    if (id) {
      try {
        await webSocketSend(
          id,
          JSON.stringify({ type: "complete", id: subIdRef.current }),
        );
      } catch {
        /* ignore */
      }
    }
    addMessage("system", "Unsubscribed");
    terminate(id, "idle");
  }

  function clearMessages() {
    setMessages([]);
  }

  return { state, messages, subscribe, unsubscribe, clearMessages };
}
