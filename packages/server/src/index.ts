import "dotenv/config";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const protoPath = resolve(root, "proto/executor.proto");

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true
});
const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
const ExecutorClient = loaded.invoke.executor.HttpExecutor;

const executorAddress = process.env.EXECUTOR_GRPC_ADDR ?? "127.0.0.1:50051";
const client = new ExecutorClient(executorAddress, grpc.credentials.createInsecure());

const headerSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().optional()
});

const executeSchema = z.object({
  method: z.string().default("GET"),
  url: z.string().min(1),
  headers: z.array(headerSchema).default([]),
  body: z.string().default(""),
  timeoutMs: z.number().int().positive().default(30000),
  followRedirects: z.boolean().default(true),
  maxRedirects: z.number().int().default(10),
  verifySsl: z.boolean().default(true),
  proxy: z
    .object({
      type: z.enum(["http", "socks5"]).default("http"),
      url: z.string().default(""),
      username: z.string().default(""),
      password: z.string().default("")
    })
    .optional()
});

export const app = new Hono();
app.use("*", logger());
app.use("*", cors());

app.get("/health", (c) => c.json({ ok: true }));

app.get("/api/ping", async (c) => {
  const response = await grpcCall<any>("Ping", {});
  return c.json(response);
});

app.post("/api/execute", zValidator("json", executeSchema), async (c) => {
  const input = c.req.valid("json");
  const response = await grpcCall<any>("Execute", executePayload(input));
  return c.json(normalizeResponse(response));
});

app.post("/api/execute/stream", zValidator("json", executeSchema), async (c) => {
  const input = c.req.valid("json");
  const stream = client.ExecuteStream(executePayload(input));
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
        if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      c.req.raw.signal.addEventListener("abort", () => {
        stream.cancel();
        close();
      });

      stream.on("data", (chunk: any) => {
        const bytes = bytesFrom(chunk.body);
        if (bytes.length > 0) send("chunk", { chunk: bytes.toString("utf8") });
        if (chunk.finalResponse) {
          send("final", normalizeResponse(chunk.finalResponse));
          close();
        }
      });
      stream.on("error", (error: Error) => {
        send("final", normalizeResponse({ error: error.message, body: Buffer.alloc(0), headers: [], timing: {} }));
        close();
      });
      stream.on("end", close);
    }
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
});

const port = Number(process.env.PORT ?? 4000);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port });
  console.log(`invoke server listening on http://localhost:${port}`);
}

function grpcCall<T>(method: "Ping" | "Execute", payload: unknown): Promise<T> {
  return new Promise((resolveCall, reject) => {
    client[method](payload, (error: grpc.ServiceError | null, response: T) => {
      if (error) reject(error);
      else resolveCall(response);
    });
  });
}

function executePayload(input: z.infer<typeof executeSchema>) {
  return {
    method: input.method,
    url: input.url,
    headers: input.headers.filter((header) => header.enabled !== false),
    body: Buffer.from(input.body),
    timeoutMs: input.timeoutMs,
    followRedirects: input.followRedirects,
    maxRedirects: input.maxRedirects,
    verifySsl: input.verifySsl,
    proxy: input.proxy
  };
}

function normalizeResponse(response: any) {
  const bodyBuffer = bytesFrom(response.body);
  const contentType = (response.headers ?? []).find((header: any) => header.key?.toLowerCase() === "content-type")?.value ?? "";
  const isText = /text\/|json|xml|html|javascript|css|yaml|csv|urlencoded/i.test(contentType) || contentType === "";
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers ?? [],
    body: isText ? bodyBuffer.toString("utf8") : bodyBuffer.toString("base64"),
    bodyEncoding: isText ? "utf8" : "base64",
    timing: response.timing ?? {},
    tls: response.tls,
    redirects: response.redirects ?? [],
    attempts: response.attempts ?? [],
    requestSize: response.requestSize,
    responseSize: response.responseSize,
    error: response.error
  };
}

function bytesFrom(value: unknown) {
  if (!value) return Buffer.alloc(0);
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(value as any);
}
