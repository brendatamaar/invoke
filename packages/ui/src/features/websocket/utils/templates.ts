import type { MsgTemplate } from "../types";

export const PROTOCOL_TEMPLATES: Record<string, MsgTemplate[]> = {
  "graphql-transport-ws": [
    {
      label: "connection_init",
      body: '{"type":"connection_init"}',
      type: "text",
    },
    {
      label: "subscribe",
      body: JSON.stringify(
        {
          type: "subscribe",
          id: "sub_1",
          payload: { query: "subscription { ... }", variables: {} },
        },
        null,
        2,
      ),
      type: "text",
    },
    {
      label: "complete",
      body: '{"type":"complete","id":"sub_1"}',
      type: "text",
    },
    { label: "ping", body: '{"type":"ping"}', type: "text" },
  ],
  MQTT: [
    {
      label: "CONNECT",
      body: JSON.stringify({ type: "CONNECT", clientId: "invoke-client", keepAlive: 60 }, null, 2),
      type: "text",
    },
    {
      label: "PUBLISH",
      body: JSON.stringify({ type: "PUBLISH", topic: "test/topic", payload: "hello" }, null, 2),
      type: "text",
    },
    {
      label: "SUBSCRIBE",
      body: JSON.stringify({ type: "SUBSCRIBE", topics: ["test/#"] }, null, 2),
      type: "text",
    },
  ],
  STOMP: [
    {
      label: "CONNECT",
      body: "CONNECT\naccept-version:1.2\nheart-beat:0,0\n\n\0",
      type: "text",
    },
    {
      label: "SEND",
      body: 'SEND\ndestination:/topic/test\ncontent-type:application/json\n\n{"message":"hello"}\0',
      type: "text",
    },
    {
      label: "SUBSCRIBE",
      body: "SUBSCRIBE\nid:sub-0\ndestination:/topic/test\n\n\0",
      type: "text",
    },
  ],
  "Socket.IO": [
    { label: "Handshake (EIO4)", body: "40", type: "text" },
    { label: "Emit event", body: '42["event","payload"]', type: "text" },
    { label: "Ping", body: "2", type: "text" },
  ],
};
