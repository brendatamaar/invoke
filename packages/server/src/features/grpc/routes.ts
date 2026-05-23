import { Schema } from "effect";
import type { Hono } from "hono";
import type {
  GrpcExecuteInput,
  GrpcReflectInput,
  GrpcStreamSendInput,
  GrpcStreamCloseInput,
} from "../../types/index.js";
import { parseJsonBody } from "../../lib/validate.js";
import { executorClient, grpcCall } from "../../grpc/executor-client.js";
import { grpcPayload } from "./payload.js";
import { grpcExecuteSchema, grpcReflectSchema } from "./schema.js";

const STREAM_POLL_MS = 100;

const grpcStreamSendSchema = Schema.Struct({
  streamId: Schema.String.pipe(Schema.minLength(1)),
  bodyJson: Schema.optionalWith(Schema.String, { default: () => "{}" }),
});

const grpcStreamCloseSchema = Schema.Struct({
  streamId: Schema.String.pipe(Schema.minLength(1)),
});

const grpcStreamPollSchema = Schema.Struct({
  streamId: Schema.String.pipe(Schema.minLength(1)),
  maxMessages: Schema.optionalWith(Schema.Number, { default: () => 50 }),
});

export function registerGrpcRoutes(app: Hono) {
  app.post("/api/grpc/reflect", async (c) => {
    const parsed = await parseJsonBody(c, grpcReflectSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as GrpcReflectInput;
    const response = await grpcCall<any>("GrpcReflect", grpcPayload(input));
    return c.json(response);
  });

  app.post("/api/grpc/execute", async (c) => {
    const parsed = await parseJsonBody(c, grpcExecuteSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as GrpcExecuteInput;
    const response = await grpcCall<any>("GrpcExecute", {
      ...grpcPayload(input),
      fullMethod: input.fullMethod,
      bodyJson: input.bodyJson,
      compression: input.compression === "gzip" ? "gzip" : "",
    });
    return c.json(response);
  });

  app.post("/api/grpc/server-stream", async (c) => {
    const parsed = await parseJsonBody(c, grpcExecuteSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as GrpcExecuteInput;
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
  });

  app.post("/api/grpc/stream/open", async (c) => {
    const parsed = await parseJsonBody(c, grpcExecuteSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as GrpcExecuteInput;
    const response = await grpcCall<any>("GrpcStreamOpen", {
      ...grpcPayload(input),
      fullMethod: input.fullMethod,
      bodyJson: input.bodyJson,
      compression: input.compression === "gzip" ? "gzip" : "",
    });
    return c.json(response);
  });

  app.post("/api/grpc/stream/send", async (c) => {
    const parsed = await parseJsonBody(c, grpcStreamSendSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as GrpcStreamSendInput;
    const response = await grpcCall<any>("GrpcStreamSend", {
      streamId: input.streamId,
      bodyJson: input.bodyJson,
    });
    return c.json(response);
  });

  app.post("/api/grpc/stream/close", async (c) => {
    const parsed = await parseJsonBody(c, grpcStreamCloseSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as GrpcStreamCloseInput;
    const response = await grpcCall<any>("GrpcStreamClose", {
      streamId: input.streamId,
    });
    return c.json(response);
  });

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
