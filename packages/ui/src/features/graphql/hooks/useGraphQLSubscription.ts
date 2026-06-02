import { useRef, useState } from "react";
import {
  webSocketClose,
  webSocketConnect,
  webSocketPoll,
  webSocketSend,
} from "../../websocket/api";
import type { KeyValue } from "@invoke/core";

export interface GQLSubMessage {
  id: string;
  kind: "data" | "error" | "system" | "complete";
  payload: string;
  createdAt: number;
}

export type GQLSubState = "idle" | "connecting" | "subscribed" | "complete" | "error";

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
      await webSocketClose(connId).catch(() => {});
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
      const { connectionId, error: connErr } = await webSocketConnect({
        url: wsUrl,
        headers: (opts.headers ?? []).filter((h) => h.enabled !== false && h.key.trim()),
        auth: { type: "none" },
        protocols: "graphql-transport-ws",
        messageMode: "text",
        message: "",
        timeoutMs: 30000,
        options: {},
      });
      if (connErr) throw new Error(connErr);
      connIdRef.current = connectionId;
      addMessage("system", "Connected");
      await webSocketSend(connectionId, JSON.stringify({ type: "connection_init" }));
      pollRef.current = setInterval(() => poll(opts), 500);
    } catch (e) {
      addMessage("error", e instanceof Error ? e.message : String(e));
      terminate(connIdRef.current, "error");
    }
  }

  async function poll(opts: SubscribeOptions) {
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
      await raw.reduce(
        (p, msg) => p.then(() => handleFrame(id, msg.body, opts)),
        Promise.resolve(),
      );
    } catch {
      /* connection may be gone */
    }
  }

  async function handleFrame(id: string, body: string, opts: SubscribeOptions) {
    let parsed: { type: string; id?: string; payload?: unknown };
    try {
      parsed = JSON.parse(body) as typeof parsed;
    } catch {
      return;
    }
    if (parsed.type === "connection_ack" && !ackReceivedRef.current) {
      ackReceivedRef.current = true;
      addMessage("system", "Acknowledged");
      await sendSubscribeFrame(id, opts);
      setState("subscribed");
    } else if (parsed.type === "next" && parsed.id === subIdRef.current) {
      addMessage("data", JSON.stringify(parsed.payload, null, 2));
    } else if (parsed.type === "error" && parsed.id === subIdRef.current) {
      addMessage("error", JSON.stringify(parsed.payload, null, 2));
      terminate(id, "error");
    } else if (parsed.type === "complete" && parsed.id === subIdRef.current) {
      addMessage("complete", "Subscription completed by server");
      terminate(id, "complete");
    } else if (parsed.type === "ping") {
      await webSocketSend(id, JSON.stringify({ type: "pong" })).catch(() => {});
    }
  }

  async function sendSubscribeFrame(id: string, opts: SubscribeOptions) {
    let vars: unknown = {};
    try {
      vars = JSON.parse(opts.variables ?? "{}");
    } catch {
      /* invalid JSON */
    }
    const payload: Record<string, unknown> = {
      query: opts.query,
      variables: vars,
    };
    if (opts.operationName) payload.operationName = opts.operationName;
    await webSocketSend(id, JSON.stringify({ type: "subscribe", id: subIdRef.current, payload }));
  }

  async function unsubscribe() {
    const id = connIdRef.current;
    if (id) {
      await webSocketSend(id, JSON.stringify({ type: "complete", id: subIdRef.current })).catch(
        () => {},
      );
    }
    addMessage("system", "Unsubscribed");
    terminate(id, "idle");
  }

  function clearMessages() {
    setMessages([]);
  }

  return { state, messages, subscribe, unsubscribe, clearMessages };
}
