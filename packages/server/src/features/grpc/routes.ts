import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Hono } from "hono";
import type {
  GrpcExecuteInput,
  GrpcReflectInput,
  GrpcStreamSendInput,
  GrpcStreamCloseInput,
  GrpcStreamPollInput,
} from "../../types/index.js";
import { executorClient, grpcCall } from "../../grpc/executor-client.js";
import { grpcPayload } from "./payload.js";
import { grpcExecuteSchema, grpcReflectSchema } from "./schema.js";

const STREAM_POLL_MS = 100;

const grpcStreamSendSchema = z.object({
  streamId: z.string().min(1),
  bodyJson: z.string().default("{}"),
});
const grpcStreamCloseSchema = z.object({ streamId: z.string().min(1) });
const grpcStreamPollSchema = z.object({
  streamId: z.string().min(1),
  maxMessages: z.number().int().positive().default(50),
});

export function registerGrpcRoutes(app: Hono) {
  app.post(
    "/api/grpc/reflect",
    zValidator("json", grpcReflectSchema),
    async (c) => {
      const input = c.req.valid("json") as GrpcReflectInput;
      const response = await grpcCall<any>("GrpcReflect", grpcPayload(input));
      return c.json(response);
    },
  );

  app.post(
    "/api/grpc/execute",
    zValidator("json", grpcExecuteSchema),
    async (c) => {
      const input = c.req.valid("json") as GrpcExecuteInput;
      const response = await grpcCall<any>("GrpcExecute", {
        ...grpcPayload(input),
        fullMethod: input.fullMethod,
        bodyJson: input.bodyJson,
        compression: input.compression === "gzip" ? "gzip" : "",
      });
      return c.json(response);
    },
  );

  app.post(
    "/api/grpc/server-stream",
    zValidator("json", grpcExecuteSchema),
    (c) => {
      const input = c.req.valid("json") as GrpcExecuteInput;
      const stream = (executorClient as any).GrpcServerStream({
        ...grpcPayload(input),
        fullMethod: input.fullMethod,
        bodyJson: input.bodyJson,
        compression: input.compression === "gzip" ? "gzip" : "",
      });
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          let closed = false;
          const close = () => {
            if (!closed) {
              closed = true;
              controller.close();
            }
          };
          const send = (data: unknown) => {
            if (!closed)
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
              );
          };

          c.req.raw.signal.addEventListener("abort", () => {
            stream.cancel();
            close();
          });

          stream.on("data", (msg: any) => {
            send({
              bodyJson: msg.bodyJson ?? "",
              done: msg.done ?? false,
              error: msg.error || undefined,
              trailers: msg.trailers ?? [],
              statusCode: msg.statusCode ?? 0,
              statusMessage: msg.statusMessage ?? "",
              durationMs: msg.durationMs ?? 0,
            });
            if (msg.done) close();
          });
          stream.on("error", (err: Error) => {
            send({ bodyJson: "", done: true, error: err.message });
            close();
          });
          stream.on("end", close);
        },
      });
      return new Response(body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    },
  );

  app.post(
    "/api/grpc/stream/open",
    zValidator("json", grpcExecuteSchema),
    async (c) => {
      const input = c.req.valid("json") as GrpcExecuteInput;
      const response = await grpcCall<any>("GrpcStreamOpen", {
        ...grpcPayload(input),
        fullMethod: input.fullMethod,
        bodyJson: input.bodyJson,
        compression: input.compression === "gzip" ? "gzip" : "",
      });
      return c.json(response);
    },
  );

  app.post(
    "/api/grpc/stream/send",
    zValidator("json", grpcStreamSendSchema),
    async (c) => {
      const input = c.req.valid("json") as GrpcStreamSendInput;
      const response = await grpcCall<any>("GrpcStreamSend", {
        streamId: input.streamId,
        bodyJson: input.bodyJson,
      });
      return c.json(response);
    },
  );

  app.post(
    "/api/grpc/stream/close",
    zValidator("json", grpcStreamCloseSchema),
    async (c) => {
      const input = c.req.valid("json") as GrpcStreamCloseInput;
      const response = await grpcCall<any>("GrpcStreamClose", {
        streamId: input.streamId,
      });
      return c.json(response);
    },
  );

  app.get("/api/grpc/stream/events", async (c) => {
    const streamId = c.req.query("streamId");
    if (!streamId) return c.json({ error: "streamId is required" }, 400);

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const close = () => {
          if (!closed) {
            closed = true;
            controller.close();
          }
        };
        const send = (data: unknown) => {
          if (!closed)
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
            );
        };

        c.req.raw.signal.addEventListener("abort", close);

        while (!closed) {
          const res = await grpcCall<any>("GrpcStreamPoll", {
            streamId,
            maxMessages: 50,
          }).catch(() => null);

          if (!res) {
            send({ error: "stream not found", done: true });
            close();
            break;
          }

          const msgs: any[] = res.messages ?? [];
          for (const msg of msgs) {
            send({
              bodyJson: msg.bodyJson ?? "",
              done: msg.done ?? false,
              error: msg.error || undefined,
              trailers: msg.trailers ?? [],
              initialMetadata: msg.initialMetadata ?? [],
              statusCode: msg.statusCode ?? 0,
              statusMessage: msg.statusMessage ?? "",
            });
            if (msg.done) {
              close();
              break;
            }
          }

          if (!closed && !res.connected) {
            send({ bodyJson: "", done: true });
            close();
            break;
          }

          if (!closed) {
            await new Promise((r) => setTimeout(r, STREAM_POLL_MS));
          }
        }
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  });
}
