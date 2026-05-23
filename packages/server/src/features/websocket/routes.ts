import type { Hono } from "hono";
import type { WebSocketConnectInput } from "../../types/index.js";
import { parseJsonBody } from "../../lib/validate.js";
import { grpcCall } from "../../grpc/executor-client.js";
import { checkSsrf } from "../../middleware/ssrfGuard.js";
import { websocketConnectPayload } from "./payload.js";
import {
  webSocketCloseSchema,
  webSocketConnectSchema,
  webSocketPollSchema,
  webSocketSendSchema,
} from "./schema.js";

const SSE_POLL_INTERVAL_MS = 100;
const SSE_MAX_MESSAGES = 50;

export function registerWebSocketRoutes(app: Hono) {
  app.post("/api/websocket/connect", async (c) => {
    const parsed = await parseJsonBody(c, webSocketConnectSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as WebSocketConnectInput;
    const ssrfError = checkSsrf(input.url);
    if (ssrfError) return c.json({ error: ssrfError }, 403);
    const response = await grpcCall<any>(
      "WebSocketConnect",
      websocketConnectPayload(input),
    );
    return c.json(response);
  });

  app.post("/api/websocket/send", async (c) => {
    const parsed = await parseJsonBody(c, webSocketSendSchema);
    if (!parsed.ok) return parsed.response;
    const response = await grpcCall<any>("WebSocketSend", parsed.data);
    return c.json(response);
  });

  app.post("/api/websocket/poll", async (c) => {
    const parsed = await parseJsonBody(c, webSocketPollSchema);
    if (!parsed.ok) return parsed.response;
    const response = await grpcCall<any>("WebSocketPoll", parsed.data);
    return c.json(response);
  });

  app.post("/api/websocket/close", async (c) => {
    const parsed = await parseJsonBody(c, webSocketCloseSchema);
    if (!parsed.ok) return parsed.response;
    const response = await grpcCall<any>("WebSocketClose", parsed.data);
    return c.json(response);
  });

  // SSE stream: browser subscribes and receives messages in near-real-time.
  // The server polls the executor at SSE_POLL_INTERVAL_MS and forwards new frames.
  app.get("/api/websocket/events", async (c) => {
    const connectionId = c.req.query("connectionId");
    if (!connectionId) {
      return c.json({ error: "connectionId query param required" }, 400);
    }

    const signal = c.req.raw.signal;
    const encoder = new TextEncoder();

    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let done = false;

        signal.addEventListener("abort", () => {
          done = true;
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });

        const send = (event: string, data: unknown) => {
          if (done) return;
          try {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            );
          } catch {
            /* stream closed */
          }
        };

        const sleep = (ms: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, ms));

        while (!done) {
          try {
            const result = await grpcCall<{
              messages: Array<{
                direction: string;
                type: string;
                body: string;
                createdAt: number;
              }>;
              connected: boolean;
              error?: string;
            }>("WebSocketPoll", {
              connectionId,
              maxMessages: SSE_MAX_MESSAGES,
            });

            for (const msg of result.messages ?? []) {
              send("message", msg);
            }

            if (!result.connected) {
              send("close", {
                reason: result.error ?? "server closed connection",
              });
              done = true;
              try {
                controller.close();
              } catch {
                /* already closed */
              }
              return;
            }
          } catch (e) {
            // executor unavailable — stop streaming
            send("close", { reason: String(e) });
            done = true;
            try {
              controller.close();
            } catch {
              /* already closed */
            }
            return;
          }

          if (!done) await sleep(SSE_POLL_INTERVAL_MS);
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  });
}
