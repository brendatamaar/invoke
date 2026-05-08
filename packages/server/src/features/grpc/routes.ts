import { zValidator } from "@hono/zod-validator";
import type { Hono } from "hono";
import type { GrpcExecuteInput, GrpcReflectInput } from "../../types/index.js";
import { executorClient, grpcCall } from "../../grpc/executor-client.js";
import { grpcPayload } from "./payload.js";
import { grpcExecuteSchema, grpcReflectSchema } from "./schema.js";

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
}
