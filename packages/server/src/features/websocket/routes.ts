import { zValidator } from "@hono/zod-validator";
import type { Hono } from "hono";
import type { WebSocketConnectInput } from "../../types/index.js";
import { grpcCall } from "../../grpc/executor-client.js";
import { websocketConnectPayload } from "./payload.js";
import {
  webSocketCloseSchema,
  webSocketConnectSchema,
  webSocketPollSchema,
  webSocketSendSchema,
} from "./schema.js";

export function registerWebSocketRoutes(app: Hono) {
  app.post(
    "/api/websocket/connect",
    zValidator("json", webSocketConnectSchema),
    async (c) => {
      const input = c.req.valid("json") as WebSocketConnectInput;
      const response = await grpcCall<any>(
        "WebSocketConnect",
        websocketConnectPayload(input),
      );
      return c.json(response);
    },
  );

  app.post(
    "/api/websocket/send",
    zValidator("json", webSocketSendSchema),
    async (c) => {
      const input = c.req.valid("json");
      const response = await grpcCall<any>("WebSocketSend", input);
      return c.json(response);
    },
  );

  app.post(
    "/api/websocket/poll",
    zValidator("json", webSocketPollSchema),
    async (c) => {
      const input = c.req.valid("json");
      const response = await grpcCall<any>("WebSocketPoll", input);
      return c.json(response);
    },
  );

  app.post(
    "/api/websocket/close",
    zValidator("json", webSocketCloseSchema),
    async (c) => {
      const input = c.req.valid("json");
      const response = await grpcCall<any>("WebSocketClose", input);
      return c.json(response);
    },
  );
}
