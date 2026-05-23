import type { Hono } from "hono";
import type { ExecuteInput } from "../../types/index.js";
import { parseJsonBody } from "../../lib/validate.js";
import {
  executorClient,
  grpcCallWithSignal,
} from "../../grpc/executor-client.js";
import { executeDigest } from "./digest-auth.js";
import { executePayload } from "./payload.js";
import { bytesFrom, normalizeResponse } from "./response.js";
import { executeSchema } from "./schema.js";

export function registerExecuteRoutes(app: Hono) {
  app.post("/api/execute", async (c) => {
    const parsed = await parseJsonBody(c, executeSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as ExecuteInput;
    const signal = c.req.raw.signal;
    try {
      const raw =
        input.auth?.type === "digest"
          ? await executeDigest(input)
          : await grpcCallWithSignal<any>(
              "Execute",
              executePayload(input),
              signal,
            );
      return c.json(normalizeResponse(raw));
    } catch (e: any) {
      if (signal.aborted || e?.code === "CANCELLED") {
        return new Response(null, { status: 499 });
      }
      return c.json(
        normalizeResponse({
          error: String(e?.message ?? e),
          body: Buffer.alloc(0),
          headers: [],
          timing: {},
        }),
      );
    }
  });

  app.post("/api/execute/stream", async (c) => {
    const parsed = await parseJsonBody(c, executeSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as ExecuteInput;
    const stream = executorClient.ExecuteStream(executePayload(input));
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
        const send = (event: string, data: unknown) => {
          if (!closed)
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            );
        };

        c.req.raw.signal.addEventListener("abort", () => {
          stream.cancel();
          close();
        });

        stream.on("data", (chunk: any) => {
          const bytes = bytesFrom(chunk.body);
          if (bytes.length > 0)
            send("chunk", {
              chunk: bytes.toString("base64"),
              encoding: "base64",
            });
          if (chunk.finalResponse) {
            send("final", normalizeResponse(chunk.finalResponse));
            close();
          }
        });
        stream.on("error", (error: Error) => {
          send(
            "final",
            normalizeResponse({
              error: error.message,
              body: Buffer.alloc(0),
              headers: [],
              timing: {},
            }),
          );
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
}
