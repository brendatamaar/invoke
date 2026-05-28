import { Schema } from "effect";
import { validateMockRoutes } from "@invoke/core";
import type { KeyValue, MockLogEntry, MockRoute } from "@invoke/core";
import type { Hono } from "hono";
import { parseJsonBody } from "../../lib/validate.js";
import type { MockConditionRequest, MockPathMatch } from "../../types/index.js";

let mockRoutes: MockRoute[] = [];
const mockLogs: MockLogEntry[] = [];
const mockSequenceIndex = new Map<string, number>();
const MAX_MOCK_REQUEST_BODY_BYTES = 1024 * 1024;

const mockHeaderSchema = Schema.Struct({
  key: Schema.String,
  value: Schema.String,
  enabled: Schema.optional(Schema.Boolean),
});

const matcherSchema = Schema.Literal(
  "equals",
  "notEquals",
  "exists",
  "gt",
  "lt",
  "contains",
  "matches",
);

const mockConditionSchema = Schema.Struct({
  source: Schema.Literal("header", "query", "bodyJsonPath"),
  expression: Schema.String,
  matcher: Schema.optionalWith(matcherSchema, { default: () => "equals" as const }),
  expected: Schema.optionalWith(Schema.String, { default: () => "" }),
});

const mockSequenceItemSchema = Schema.Struct({
  status: Schema.Number,
  headers: Schema.optionalWith(Schema.Array(mockHeaderSchema), { default: () => [] }),
  body: Schema.optionalWith(Schema.String, { default: () => "" }),
  latencyMs: Schema.optional(Schema.Number),
});

const mockRouteSchema = Schema.Struct({
  id: Schema.String,
  enabled: Schema.optional(Schema.Boolean),
  method: Schema.Literal("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"),
  pathPattern: Schema.String.pipe(Schema.minLength(1)),
  status: Schema.Number,
  headers: Schema.optionalWith(Schema.Array(mockHeaderSchema), { default: () => [] }),
  body: Schema.optionalWith(Schema.String, { default: () => "" }),
  latencyMs: Schema.optional(Schema.Number),
  conditions: Schema.optional(Schema.Array(mockConditionSchema)),
  sequences: Schema.optional(Schema.Array(mockSequenceItemSchema)),
});

export const mockRoutesSchema = Schema.Struct({
  routes: Schema.Array(mockRouteSchema),
}).pipe(
  Schema.filter((input) => {
    const validation = validateMockRoutes(input.routes as unknown as MockRoute[]);
    if (validation.errors.length > 0) return validation.errors[0].message;
    return true;
  }),
);

export function registerMockRoutes(app: Hono) {
  app.get("/api/mock/routes", (c) =>
    c.json({
      routes: mockRoutes,
      logs: mockLogs.slice(-200).reverse(),
      totalLogs: mockLogs.length,
    }),
  );

  app.put("/api/mock/routes", async (c) => {
    const parsed = await parseJsonBody(c, mockRoutesSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;
    mockRoutes = input.routes.map((route) => ({
      ...route,
      headers: [...(route.headers ?? [])],
      enabled: route.enabled ?? true,
    })) as unknown as MockRoute[];
    mockSequenceIndex.clear();
    return c.json({ routes: mockRoutes, count: mockRoutes.length });
  });

  app.delete("/api/mock/logs", (c) => {
    mockLogs.splice(0, mockLogs.length);
    return c.json({ ok: true });
  });

  app.all("/mock/*", async (c) => {
    const url = new URL(c.req.url);
    const path = url.pathname.replace(/^\/mock/, "") || "/";
    const method = c.req.method.toUpperCase();
    const contentLength = Number(c.req.header("content-length") ?? 0);
    if (contentLength > MAX_MOCK_REQUEST_BODY_BYTES) {
      return c.text("Mock request body too large", 413);
    }
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
    const activeItem = nextMockResponseItem(matched);

    if (activeItem.latencyMs)
      await new Promise((resolveDelay) => setTimeout(resolveDelay, activeItem.latencyMs));
    const responseBody = renderMockTemplate(activeItem.body, match.params, url.searchParams);
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
}

export function proxyRecordsToMockRoutes(
  records: {
    id: string;
    method: string;
    path: string;
    status: number;
    responseHeaders: KeyValue[];
    responseBody: string;
  }[],
) {
  const validMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
  const newRoutes: MockRoute[] = records.map((r) => ({
    id: crypto.randomUUID(),
    enabled: true,
    method: (validMethods.has(r.method.toUpperCase())
      ? r.method.toUpperCase()
      : "GET") as MockRoute["method"],
    pathPattern: r.path.split("?")[0] || "/",
    status: r.status,
    headers: r.responseHeaders,
    body: r.responseBody,
    latencyMs: 0,
  }));

  const existing = mockRoutes.filter(
    (route) =>
      !newRoutes.some(
        (nr) =>
          nr.method === route.method &&
          nr.pathPattern === route.pathPattern &&
          (!route.conditions || route.conditions.length === 0),
      ),
  );
  mockRoutes = [...existing, ...newRoutes];
  mockSequenceIndex.clear();
  return { added: newRoutes.length, routes: mockRoutes };
}

function nextMockResponseItem(route: MockRoute) {
  if (route.sequences && route.sequences.length > 0) {
    const idx = mockSequenceIndex.get(route.id) ?? 0;
    const item = route.sequences[idx % route.sequences.length];
    mockSequenceIndex.set(route.id, idx + 1);
    return item;
  }
  return route;
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
  request: MockConditionRequest,
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
  request: MockConditionRequest,
  bodyJson: () => unknown,
) {
  if (condition.source === "header") {
    const name = condition.expression.trim().toLowerCase();
    return request.headers.find((header) => header.key.trim().toLowerCase() === name)?.value;
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
  if (actual === undefined || actual === null) return false;
  if (matcher === "notEquals") return String(actual) !== expected;
  if (matcher === "contains") return String(actual).includes(expected);
  if (matcher === "matches") {
    try {
      return new RegExp(`^(?:${expected})$`).test(String(actual));
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
    if (Array.isArray(value) && /^\d+$/.test(token)) return value[Number(token)];
    if (typeof value === "object") return (value as Record<string, unknown>)[token];
    return undefined;
  }, json);
}

function matchPath(pattern: string, path: string): MockPathMatch {
  const patternParts = normalizePath(pattern).split("/");
  const pathParts = normalizePath(path).split("/");
  const params: Record<string, string> = {};
  if (patternParts.length !== pathParts.length) return { matched: false, params };
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index];
    const actual = pathParts[index];
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = safeDecodeURIComponent(actual);
      continue;
    }
    if (expected.toLowerCase() !== actual.toLowerCase()) return { matched: false, params: {} };
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

function renderMockTemplate(body: string, params: Record<string, string>, query: URLSearchParams) {
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
