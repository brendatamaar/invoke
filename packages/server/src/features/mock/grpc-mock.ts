import { Schema } from "effect";
import type { Hono } from "hono";
import { parseJsonBody } from "../../lib/validate.js";

/**
 * In-memory mock gRPC server.
 * Accepts a map of canned responses keyed by full method (e.g. "package.Service/Method")
 * and serves them when the UI calls /api/mock-grpc/invoke.
 * Useful for offline / CI / demo scenarios.
 */

export interface MockGrpcRoute {
  fullMethod: string;
  responses: MockGrpcResponse[];
  latencyMs?: number;
  enabled?: boolean;
}

export interface MockGrpcResponse {
  bodyJson: string;
  statusCode?: number;
  statusMessage?: string;
  trailers?: Array<{ key: string; value: string }>;
}

interface MockGrpcLog {
  id: string;
  fullMethod: string;
  requestBody: string;
  responseBody: string;
  statusCode: number;
  matched: boolean;
  createdAt: number;
}

let grpcMockRoutes: MockGrpcRoute[] = [];
const grpcMockLogs: MockGrpcLog[] = [];
const sequenceIndex = new Map<string, number>();

const mockGrpcRouteSchema = Schema.Struct({
  fullMethod: Schema.String.pipe(Schema.minLength(1)),
  responses: Schema.Array(
    Schema.Struct({
      bodyJson: Schema.optionalWith(Schema.String, { default: () => "{}" }),
      statusCode: Schema.optionalWith(Schema.Number, { default: () => 0 }),
      statusMessage: Schema.optionalWith(Schema.String, { default: () => "" }),
      trailers: Schema.optionalWith(
        Schema.Array(Schema.Struct({ key: Schema.String, value: Schema.String })),
        { default: () => [] },
      ),
    }),
  ).pipe(Schema.minItems(1)),
  latencyMs: Schema.optional(Schema.Number),
  enabled: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});

const mockGrpcRoutesSchema = Schema.Struct({
  routes: Schema.Array(mockGrpcRouteSchema),
});

const mockGrpcCallSchema = Schema.Struct({
  fullMethod: Schema.String.pipe(Schema.minLength(1)),
  bodyJson: Schema.optionalWith(Schema.String, { default: () => "{}" }),
});

export function registerMockGrpcRoutes(app: Hono) {
  app.get("/api/mock-grpc/routes", (c) =>
    c.json({
      routes: grpcMockRoutes,
      logs: grpcMockLogs.slice(-200).reverse(),
    }),
  );

  app.put("/api/mock-grpc/routes", async (c) => {
    const parsed = await parseJsonBody(c, mockGrpcRoutesSchema);
    if (!parsed.ok) return parsed.response;
    grpcMockRoutes = parsed.data.routes as unknown as MockGrpcRoute[];
    sequenceIndex.clear();
    return c.json({ routes: grpcMockRoutes, count: grpcMockRoutes.length });
  });

  app.delete("/api/mock-grpc/logs", (c) => {
    grpcMockLogs.splice(0, grpcMockLogs.length);
    return c.json({ ok: true });
  });

  app.post("/api/mock-grpc/invoke", async (c) => {
    const parsed = await parseJsonBody(c, mockGrpcCallSchema);
    if (!parsed.ok) return parsed.response;
    {
      const { fullMethod, bodyJson } = parsed.data;
      const route = grpcMockRoutes.find(
        (r) => r.enabled !== false && r.fullMethod === fullMethod,
      );

      if (!route) {
        const log: MockGrpcLog = {
          id: crypto.randomUUID(),
          fullMethod,
          requestBody: bodyJson,
          responseBody: "",
          statusCode: 12, // UNIMPLEMENTED
          matched: false,
          createdAt: Date.now(),
        };
        grpcMockLogs.push(log);
        trimLogs();
        return c.json({
          bodyJson: "",
          statusCode: 12,
          statusMessage: `No mock route for ${fullMethod}`,
          metadata: [],
          trailers: [],
          durationMs: 0,
          error: `No mock route for ${fullMethod}`,
        });
      }

      if (route.latencyMs) {
        await new Promise((r) => setTimeout(r, route.latencyMs));
      }

      const idx = sequenceIndex.get(route.fullMethod) ?? 0;
      const response = route.responses[idx % route.responses.length];
      sequenceIndex.set(route.fullMethod, idx + 1);

      const log: MockGrpcLog = {
        id: crypto.randomUUID(),
        fullMethod,
        requestBody: bodyJson,
        responseBody: response.bodyJson,
        statusCode: response.statusCode ?? 0,
        matched: true,
        createdAt: Date.now(),
      };
      grpcMockLogs.push(log);
      trimLogs();

      return c.json({
        bodyJson: response.bodyJson,
        statusCode: response.statusCode ?? 0,
        statusMessage: response.statusMessage ?? "OK",
        metadata: [],
        trailers: response.trailers ?? [],
        durationMs: route.latencyMs ?? 0,
      });
    }
  });
}

function trimLogs() {
  if (grpcMockLogs.length > 1000)
    grpcMockLogs.splice(0, grpcMockLogs.length - 1000);
}

/** Reset state (for testing). */
export function resetMockGrpcState() {
  grpcMockRoutes = [];
  grpcMockLogs.splice(0, grpcMockLogs.length);
  sequenceIndex.clear();
}
