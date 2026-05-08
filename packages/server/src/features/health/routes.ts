import type { Hono } from "hono";
import { grpcCall } from "../../grpc/executor-client.js";

export function registerHealthRoutes(app: Hono) {
  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/api/ping", async (c) => {
    const response = await grpcCall<any>("Ping", {});
    return c.json(response);
  });
}
