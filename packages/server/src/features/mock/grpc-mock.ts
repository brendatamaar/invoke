import type { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

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

const mockGrpcRouteSchema = z.object({
  fullMethod: z.string().min(1),
  responses: z.array(z.object({
    bodyJson: z.string().default("{}"),
    statusCode: z.number().int().min(0).max(16).default(0),
    statusMessage: z.string().default(""),
    trailers: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
  })).min(1),
  latencyMs: z.number().int().min(0).max(30000).optional(),
  enabled: z.boolean().default(true),
});

const mockGrpcRoutesSchema = z.object({
  routes: z.array(mockGrpcRouteSchema),
});

const mockGrpcInvokeSchema = z.object({
  fullMethod: z.string().min(1),
  bodyJson: z.string().default("{}"),
});

export function registerMockGrpcRoutes(app: Hono) {
  app.get("/api/mock-grpc/routes", (c) =>
    c.json({ routes: grpcMockRoutes, logs: grpcMockLogs.slice(-200).reverse() }),
  );

  app.put(
    "/api/mock-grpc/routes",
    zValidator("json", mockGrpcRoutesSchema),
    (c) => {
      const input = c.req.valid("json");
      grpcMockRoutes = input.routes;
      sequenceIndex.clear();
      return c.json({ routes: grpcMockRoutes, count: grpcMockRoutes.length });
    },
  );

  app.delete("/api/mock-grpc/logs", (c) => {
    grpcMockLogs.splice(0, grpcMockLogs.length);
    return c.json({ ok: true });
  });

  app.post(
    "/api/mock-grpc/invoke",
    zValidator("json", mockGrpcInvokeSchema),
    async (c) => {
      const { fullMethod, bodyJson } = c.req.valid("json");
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
    },
  );
}

function trimLogs() {
  if (grpcMockLogs.length > 1000) grpcMockLogs.splice(0, grpcMockLogs.length - 1000);
}

/** Reset state (for testing). */
export function resetMockGrpcState() {
  grpcMockRoutes = [];
  grpcMockLogs.splice(0, grpcMockLogs.length);
  sequenceIndex.clear();
}
