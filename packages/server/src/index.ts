import "dotenv/config";
import nodeCrypto from "node:crypto";
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
import { validateMockRoutes } from "@invoke/core";
import type { KeyValue, MockLogEntry, MockRoute, MockSequenceItem } from "@invoke/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../../..");
const protoPath = resolve(root, "proto/executor.proto");

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
});
const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
const ExecutorClient = loaded.invoke.executor.HttpExecutor;

const executorAddress = process.env.EXECUTOR_GRPC_ADDR ?? "127.0.0.1:50051";
const client = new ExecutorClient(
  executorAddress,
  grpc.credentials.createInsecure(),
);
let mockRoutes: MockRoute[] = [];
const mockLogs: MockLogEntry[] = [];
const mockSequenceIndex = new Map<string, number>();
const MAX_MOCK_REQUEST_BODY_BYTES = 1024 * 1024;

type WebhookValidationType = "none" | "hmac" | "header";
type HmacAlgorithm = "sha256" | "sha1" | "sha512";

interface WebhookValidationConfig {
  type: WebhookValidationType;
  // HMAC fields
  secret?: string;
  algorithm?: HmacAlgorithm;
  signatureHeader?: string;
  signaturePrefix?: string;
  // Header token fields
  headerName?: string;
  headerValue?: string;
}

interface WebhookEntry {
  id: string;
  method: string;
  headers: KeyValue[];
  body: string;
  createdAt: number;
  validationPassed: boolean;
  validationError?: string;
}

const webhookLogs = new Map<string, WebhookEntry[]>();
const webhookConfigs = new Map<string, WebhookValidationConfig>();
const MAX_WEBHOOK_ENTRIES = 200;

function validateWebhookRequest(
  config: WebhookValidationConfig,
  headers: KeyValue[],
  body: string,
): { passed: boolean; error?: string } {
  if (config.type === "none") return { passed: true };

  if (config.type === "header") {
    if (!config.headerName || !config.headerValue) return { passed: true };
    const found = headers.find(
      (h) => h.key.toLowerCase() === config.headerName!.toLowerCase(),
    );
    if (!found) return { passed: false, error: `Missing header: ${config.headerName}` };
    if (found.value !== config.headerValue)
      return { passed: false, error: "Header token mismatch" };
    return { passed: true };
  }

  if (config.type === "hmac") {
    if (!config.secret || !config.signatureHeader)
      return { passed: false, error: "HMAC secret or signature header not configured" };
    const algorithm = config.algorithm ?? "sha256";
    const sigHeader = headers.find(
      (h) => h.key.toLowerCase() === config.signatureHeader!.toLowerCase(),
    );
    if (!sigHeader)
      return { passed: false, error: `Missing signature header: ${config.signatureHeader}` };
    const rawSig = sigHeader.value;
    const prefix = config.signaturePrefix ?? "";
    const receivedHex = prefix && rawSig.startsWith(prefix)
      ? rawSig.slice(prefix.length)
      : rawSig;
    const expectedHex = nodeCrypto
      .createHmac(algorithm, config.secret)
      .update(body, "utf8")
      .digest("hex");
    try {
      const passed = nodeCrypto.timingSafeEqual(
        Buffer.from(receivedHex.padEnd(expectedHex.length, "0"), "hex"),
        Buffer.from(expectedHex, "hex"),
      );
      return passed ? { passed: true } : { passed: false, error: "Signature mismatch" };
    } catch {
      return { passed: false, error: "Invalid signature format" };
    }
  }

  return { passed: true };
}

const headerSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().optional(),
});

const tlsClientConfigSchema = z
  .object({
    clientCertPem: z.string().default(""),
    clientKeyPem: z.string().default(""),
    caCertPem: z.string().default(""),
    serverName: z.string().default(""),
  })
  .optional();

const executeSchema = z.object({
  method: z.string().default("GET"),
  url: z.string().min(1),
  headers: z.array(headerSchema).default([]),
  body: z.string().default(""),
  auth: z
    .object({
      type: z.string().default("none"),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
  timeoutMs: z.number().int().positive().default(30000),
  followRedirects: z.boolean().default(true),
  maxRedirects: z.number().int().default(10),
  verifySsl: z.boolean().default(true),
  proxy: z
    .object({
      type: z.enum(["http", "socks5"]).default("http"),
      url: z.string().default(""),
      username: z.string().default(""),
      password: z.string().default(""),
    })
    .optional(),
  tlsClientConfig: tlsClientConfigSchema,
});

const webSocketConnectSchema = z.object({
  url: z.string().min(1),
  headers: z.array(headerSchema).default([]),
  protocols: z.array(z.string()).default([]),
  timeoutMs: z.number().int().positive().default(30000),
  verifySsl: z.boolean().default(true),
  tlsClientConfig: tlsClientConfigSchema,
});

const webSocketSendSchema = z.object({
  connectionId: z.string().min(1),
  body: z.string().default(""),
  binary: z.boolean().default(false),
});

const webSocketPollSchema = z.object({
  connectionId: z.string().min(1),
  maxMessages: z.number().int().min(1).max(100).default(100),
});

const webSocketCloseSchema = z.object({
  connectionId: z.string().min(1),
});

const grpcReflectSchema = z.object({
  address: z.string().min(1),
  tls: z.boolean().default(true),
  timeoutMs: z.number().int().positive().default(30000),
  metadata: z.array(headerSchema).default([]),
  verifySsl: z.boolean().default(true),
  tlsClientConfig: tlsClientConfigSchema,
});

const grpcExecuteSchema = grpcReflectSchema.extend({
  fullMethod: z.string().min(1),
  bodyJson: z.string().default("{}"),
});

const oauth2ClientCredentialsSchema = z.object({
  tokenUrl: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().default(""),
  scope: z.string().default(""),
});

const mockHeaderSchema = z.object({
  key: z.string(),
  value: z.string(),
  enabled: z.boolean().optional(),
});

const matcherSchema = z.enum([
  "equals",
  "notEquals",
  "exists",
  "gt",
  "lt",
  "contains",
  "matches",
]);

const mockConditionSchema = z.object({
  source: z.enum(["header", "query", "bodyJsonPath"]),
  expression: z.string(),
  matcher: matcherSchema.default("equals"),
  expected: z.string().default(""),
});

const mockSequenceItemSchema = z.object({
  status: z.number().int().min(100).max(599),
  headers: z.array(mockHeaderSchema).default([]),
  body: z.string().default(""),
  latencyMs: z.number().int().min(0).max(30000).optional(),
});

const mockRouteSchema = z.object({
  id: z.string(),
  enabled: z.boolean().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]),
  pathPattern: z.string().min(1),
  status: z.number().int().min(100).max(599),
  headers: z.array(mockHeaderSchema).default([]),
  body: z.string().default(""),
  latencyMs: z.number().int().min(0).max(30000).optional(),
  conditions: z.array(mockConditionSchema).optional(),
  sequences: z.array(mockSequenceItemSchema).optional(),
});

const mockRoutesSchema = z
  .object({
    routes: z.array(mockRouteSchema),
  })
  .superRefine((input, ctx) => {
    const validation = validateMockRoutes(input.routes);
    validation.errors.forEach((issue) => {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path:
          issue.routeIndex === undefined
            ? ["routes"]
            : ["routes", issue.routeIndex],
      });
    });
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
  const response =
    input.auth?.type === "digest"
      ? await executeDigest(input)
      : await grpcCall<any>("Execute", executePayload(input));
  return c.json(normalizeResponse(response));
});

app.post(
  "/api/execute/stream",
  zValidator("json", executeSchema),
  async (c) => {
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
            send("chunk", { chunk: bytes.toString("utf8") });
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
  },
);

app.post(
  "/api/websocket/connect",
  zValidator("json", webSocketConnectSchema),
  async (c) => {
    const input = c.req.valid("json");
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

app.post(
  "/api/grpc/reflect",
  zValidator("json", grpcReflectSchema),
  async (c) => {
    const input = c.req.valid("json");
    const response = await grpcCall<any>("GrpcReflect", grpcPayload(input));
    return c.json(response);
  },
);

app.post(
  "/api/grpc/execute",
  zValidator("json", grpcExecuteSchema),
  async (c) => {
    const input = c.req.valid("json");
    const response = await grpcCall<any>("GrpcExecute", {
      ...grpcPayload(input),
      fullMethod: input.fullMethod,
      bodyJson: input.bodyJson,
    });
    return c.json(response);
  },
);

app.post(
  "/api/oauth2/client-credentials",
  zValidator("json", oauth2ClientCredentialsSchema),
  async (c) => {
    const input = c.req.valid("json");
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    if (input.scope.trim()) body.set("scope", input.scope.trim());
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (input.clientId || input.clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`;
    }
    const tokenResponse = await fetch(input.tokenUrl, {
      method: "POST",
      headers,
      body,
    });
    const text = await tokenResponse.text();
    if (!tokenResponse.ok) {
      return c.json(
        { error: text || tokenResponse.statusText },
        tokenResponse.status as any,
      );
    }
    const payload = JSON.parse(text) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: string;
    };
    return c.json({
      accessToken: payload.access_token,
      tokenType: payload.token_type ?? "Bearer",
      expiresIn: payload.expires_in,
      error: payload.error,
    });
  },
);

app.get("/api/mock/routes", (c) =>
  c.json({ routes: mockRoutes, logs: mockLogs.slice(-200).reverse() }),
);

app.put("/api/mock/routes", zValidator("json", mockRoutesSchema), (c) => {
  const input = c.req.valid("json");
  mockRoutes = input.routes.map((route) => ({
    ...route,
    headers: route.headers ?? [],
    enabled: route.enabled ?? true,
  }));
  mockSequenceIndex.clear();
  return c.json({ routes: mockRoutes, count: mockRoutes.length });
});

app.delete("/api/mock/logs", (c) => {
  mockLogs.splice(0, mockLogs.length);
  return c.json({ ok: true });
});

app.get("/api/webhook/:id/logs", (c) => {
  const { id: webhookId } = c.req.param();
  return c.json({ entries: webhookLogs.get(webhookId) ?? [] });
});

app.delete("/api/webhook/:id/logs", (c) => {
  const { id: webhookId } = c.req.param();
  webhookLogs.delete(webhookId);
  return c.json({ ok: true });
});

const webhookValidationSchema = z.object({
  type: z.enum(["none", "hmac", "header"]),
  secret: z.string().optional(),
  algorithm: z.enum(["sha256", "sha1", "sha512"]).optional(),
  signatureHeader: z.string().optional(),
  signaturePrefix: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
});

app.put("/api/webhook/:id/config", zValidator("json", webhookValidationSchema), (c) => {
  const { id: webhookId } = c.req.param();
  const config = c.req.valid("json") as WebhookValidationConfig;
  webhookConfigs.set(webhookId, config);
  return c.json({ ok: true });
});

app.delete("/api/webhook/:id", (c) => {
  const { id: webhookId } = c.req.param();
  webhookLogs.delete(webhookId);
  webhookConfigs.delete(webhookId);
  return c.json({ ok: true });
});

app.all("/webhook/:id", async (c) => {
  const { id: webhookId } = c.req.param();
  const body = await c.req.text();
  const headers = requestHeaders(c.req.raw.headers);
  const config = webhookConfigs.get(webhookId) ?? { type: "none" as const };
  const validation = validateWebhookRequest(config, headers, body);
  const entry: WebhookEntry = {
    id: nodeCrypto.randomUUID(),
    method: c.req.method.toUpperCase(),
    headers,
    body,
    createdAt: Date.now(),
    validationPassed: validation.passed,
    validationError: validation.error,
  };
  const existing = webhookLogs.get(webhookId) ?? [];
  existing.unshift(entry);
  if (existing.length > MAX_WEBHOOK_ENTRIES) existing.length = MAX_WEBHOOK_ENTRIES;
  webhookLogs.set(webhookId, existing);
  return c.json({ ok: true, validationPassed: validation.passed });
});

app.all("/mock/*", async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname.replace(/^\/mock/, "") || "/";
  const method = c.req.method.toUpperCase();
  const body = await c.req.text();
  if (Buffer.byteLength(body) > MAX_MOCK_REQUEST_BODY_BYTES) {
    return c.text("Mock request body too large", 413);
  }
  const headers = requestHeaders(c.req.raw.headers);
  const matched = mockRoutes.find((route) => {
    if (route.enabled === false || route.method !== method) return false;
    const match = matchPath(route.pathPattern, path);
    return (
      match.matched &&
      mockConditionsMatch(route.conditions ?? [], {
        headers,
        query: url.searchParams,
        body,
      })
    );
  });
  if (!matched) {
    logMockRequest({
      matched: false,
      method,
      path,
      status: 404,
      headers,
      body,
    });
    return c.text("No mock route matched", 404);
  }

  const match = matchPath(matched.pathPattern, path);

  let activeItem: Pick<MockSequenceItem, "status" | "headers" | "body" | "latencyMs"> = matched;
  if (matched.sequences && matched.sequences.length > 0) {
    const idx = mockSequenceIndex.get(matched.id) ?? 0;
    activeItem = matched.sequences[idx % matched.sequences.length];
    mockSequenceIndex.set(matched.id, idx + 1);
  }

  if (activeItem.latencyMs)
    await new Promise((resolveDelay) =>
      setTimeout(resolveDelay, activeItem.latencyMs),
    );
  const responseBody = renderMockTemplate(
    activeItem.body,
    match.params,
    url.searchParams,
  );
  const responseHeaders = Object.fromEntries(
    (activeItem.headers ?? [])
      .filter((header) => header.enabled !== false && header.key.trim())
      .map((header) => [header.key, header.value]),
  );
  logMockRequest({
    routeId: matched.id,
    matched: true,
    method,
    path,
    status: activeItem.status,
    headers,
    body,
  });
  return new Response(responseBody, {
    status: activeItem.status,
    headers: responseHeaders,
  });
});

const port = Number(process.env.PORT ?? 4000);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port });
  console.log(`invoke server listening on http://localhost:${port}`);
}

function grpcCall<T>(
  method:
    | "Ping"
    | "Execute"
    | "WebSocketConnect"
    | "WebSocketSend"
    | "WebSocketPoll"
    | "WebSocketClose"
    | "GrpcReflect"
    | "GrpcExecute",
  payload: unknown,
): Promise<T> {
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
    proxy: input.proxy,
    tlsClientConfig: tlsClientConfigPayload(input.tlsClientConfig),
  };
}

async function executeDigest(input: z.infer<typeof executeSchema>) {
  const first = await grpcCall<any>(
    "Execute",
    executePayload({
      ...input,
      headers: input.headers.filter(
        (header) => header.key.toLowerCase() !== "authorization",
      ),
    }),
  );
  const challenge = (first.headers ?? []).find(
    (header: any) => header.key?.toLowerCase() === "www-authenticate",
  )?.value as string | undefined;
  if (first.status !== 401 || !challenge?.toLowerCase().startsWith("digest"))
    return first;

  const authorization = digestAuthorizationHeader(input, challenge);
  const second = await grpcCall<any>(
    "Execute",
    executePayload({
      ...input,
      headers: [
        ...input.headers.filter(
          (header) => header.key.toLowerCase() !== "authorization",
        ),
        { key: "Authorization", value: authorization, enabled: true },
      ],
    }),
  );
  return second;
}

function digestAuthorizationHeader(
  input: z.infer<typeof executeSchema>,
  challenge: string,
) {
  const auth = input.auth ?? { type: "digest" };
  const values = parseDigestChallenge(challenge);
  const realm = values.realm ?? "";
  const nonce = values.nonce ?? "";
  const algorithm = (values.algorithm ?? "MD5").toUpperCase();
  const qop = (values.qop ?? "")
    .split(",")
    .map((value) => value.trim())
    .find((value) => value === "auth");
  const uri = digestUri(input.url);
  const username = auth.username ?? "";
  const password = auth.password ?? "";
  const cnonce = nodeCrypto.randomBytes(12).toString("hex");
  const nc = "00000001";
  const hash = (value: string) =>
    nodeCrypto
      .createHash(algorithm === "SHA-256" ? "sha256" : "md5")
      .update(value)
      .digest("hex");
  const ha1 = hash(`${username}:${realm}:${password}`);
  const ha2 = hash(`${input.method.toUpperCase()}:${uri}`);
  const response = qop
    ? hash(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : hash(`${ha1}:${nonce}:${ha2}`);
  const parts = [
    `username="${escapeDigestValue(username)}"`,
    `realm="${escapeDigestValue(realm)}"`,
    `nonce="${escapeDigestValue(nonce)}"`,
    `uri="${escapeDigestValue(uri)}"`,
    `response="${response}"`,
    `algorithm=${algorithm}`,
  ];
  if (values.opaque) parts.push(`opaque="${escapeDigestValue(values.opaque)}"`);
  if (qop) parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  return `Digest ${parts.join(", ")}`;
}

function parseDigestChallenge(challenge: string) {
  const raw = challenge.replace(/^Digest\s+/i, "");
  const values: Record<string, string> = {};
  raw.replace(
    /([a-zA-Z0-9_-]+)=("(?:[^"\\]|\\.)*"|[^,]*)/g,
    (_match, key: string, value: string) => {
      values[key.toLowerCase()] = value.startsWith('"')
        ? value.slice(1, -1).replace(/\\"/g, '"')
        : value.trim();
      return "";
    },
  );
  return values;
}

function digestUri(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl;
  }
}

function escapeDigestValue(value: string) {
  return value.replace(/(["\\])/g, "\\$1");
}

function websocketConnectPayload(
  input: z.infer<typeof webSocketConnectSchema>,
) {
  return {
    url: input.url,
    headers: input.headers.filter((header) => header.enabled !== false),
    protocols: input.protocols
      .map((protocol) => protocol.trim())
      .filter(Boolean),
    timeoutMs: input.timeoutMs,
    verifySsl: input.verifySsl,
    tlsClientConfig: tlsClientConfigPayload(input.tlsClientConfig),
  };
}

function grpcPayload(input: z.infer<typeof grpcReflectSchema>) {
  return {
    address: input.address,
    tls: input.tls,
    timeoutMs: input.timeoutMs,
    metadata: input.metadata.filter((header) => header.enabled !== false),
    verifySsl: input.verifySsl,
    tlsClientConfig: tlsClientConfigPayload(input.tlsClientConfig),
  };
}

function tlsClientConfigPayload(input: z.infer<typeof tlsClientConfigSchema>) {
  if (!input) return undefined;
  const hasValue = [
    input.clientCertPem,
    input.clientKeyPem,
    input.caCertPem,
    input.serverName,
  ].some((value) => value.trim() !== "");
  if (!hasValue) return undefined;
  return {
    clientCertPem: Buffer.from(input.clientCertPem),
    clientKeyPem: Buffer.from(input.clientKeyPem),
    caCertPem: Buffer.from(input.caCertPem),
    serverName: input.serverName,
  };
}

function normalizeResponse(response: any) {
  const bodyBuffer = bytesFrom(response.body);
  const contentType =
    (response.headers ?? []).find(
      (header: any) => header.key?.toLowerCase() === "content-type",
    )?.value ?? "";
  const isText =
    /text\/|json|xml|html|javascript|css|yaml|csv|urlencoded/i.test(
      contentType,
    ) || contentType === "";
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
    error: response.error,
  };
}

function bytesFrom(value: unknown) {
  if (!value) return Buffer.alloc(0);
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(value as any);
}

function requestHeaders(headers: Headers): KeyValue[] {
  return [...headers.entries()].map(([key, value]) => ({
    key,
    value,
    enabled: true,
  }));
}

function mockConditionsMatch(
  conditions: NonNullable<MockRoute["conditions"]>,
  request: { headers: KeyValue[]; query: URLSearchParams; body: string },
) {
  if (conditions.length === 0) return true;
  let parsedBody: unknown;
  let parsedBodyReady = false;
  const bodyJson = () => {
    if (!parsedBodyReady) {
      parsedBodyReady = true;
      try {
        parsedBody = JSON.parse(request.body);
      } catch {
        parsedBody = undefined;
      }
    }
    return parsedBody;
  };

  return conditions.every((condition) => {
    const actual = mockConditionActual(condition, request, bodyJson);
    return compareMockValues(actual, condition.expected, condition.matcher);
  });
}

function mockConditionActual(
  condition: NonNullable<MockRoute["conditions"]>[number],
  request: { headers: KeyValue[]; query: URLSearchParams; body: string },
  bodyJson: () => unknown,
) {
  if (condition.source === "header") {
    const name = condition.expression.trim().toLowerCase();
    return request.headers.find(
      (header) => header.key.trim().toLowerCase() === name,
    )?.value;
  }
  if (condition.source === "query") {
    return request.query.get(condition.expression.trim()) ?? undefined;
  }
  return readSimpleJsonPath(bodyJson(), condition.expression);
}

function compareMockValues(
  actual: unknown,
  expected: string,
  matcher: NonNullable<MockRoute["conditions"]>[number]["matcher"],
) {
  if (matcher === "exists") return actual !== undefined && actual !== null;
  if (matcher === "notEquals") return String(actual) !== expected;
  if (matcher === "contains") return String(actual ?? "").includes(expected);
  if (matcher === "matches") {
    try {
      return new RegExp(expected).test(String(actual ?? ""));
    } catch {
      return false;
    }
  }
  if (matcher === "gt") return Number(actual) > Number(expected);
  if (matcher === "lt") return Number(actual) < Number(expected);
  return String(actual) === expected;
}

function readSimpleJsonPath(json: unknown, expression: string) {
  if (json == null) return undefined;
  const trimmed = expression.trim();
  if (!trimmed || trimmed === "$") return json;
  const tokens = trimmed
    .replace(/^\$\.?/, "")
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/\[['"]([^'"]+)['"]\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  return tokens.reduce<unknown>((value, token) => {
    if (value == null) return undefined;
    if (Array.isArray(value) && /^\d+$/.test(token))
      return value[Number(token)];
    if (typeof value === "object")
      return (value as Record<string, unknown>)[token];
    return undefined;
  }, json);
}

function matchPath(pattern: string, path: string) {
  const patternParts = normalizePath(pattern).split("/");
  const pathParts = normalizePath(path).split("/");
  const params: Record<string, string> = {};
  if (patternParts.length !== pathParts.length)
    return { matched: false, params };
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index];
    const actual = pathParts[index];
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = safeDecodeURIComponent(actual);
      continue;
    }
    if (expected !== actual) return { matched: false, params: {} };
  }
  return { matched: true, params };
}

function normalizePath(path: string) {
  return path.replace(/^\/+|\/+$/g, "");
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function renderMockTemplate(
  body: string,
  params: Record<string, string>,
  query: URLSearchParams,
) {
  return body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawName: string) => {
    const name = rawName.trim();
    if (name.startsWith("param.")) return params[name.slice(6)] ?? "";
    if (name.startsWith("query.")) return query.get(name.slice(6)) ?? "";
    if (name === "$uuid" || name === "$randomUUID") return crypto.randomUUID();
    if (name === "$timestamp") return String(Math.floor(Date.now() / 1000));
    if (name === "$timestampMs") return String(Date.now());
    if (name === "$randomInt") return String(Math.floor(Math.random() * 1000));
    return `{{${name}}}`;
  });
}

function logMockRequest(entry: Omit<MockLogEntry, "id" | "createdAt">) {
  mockLogs.push({ ...entry, id: crypto.randomUUID(), createdAt: Date.now() });
  if (mockLogs.length > 1000) mockLogs.splice(0, mockLogs.length - 1000);
}
