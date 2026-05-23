import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { registerExecuteRoutes } from "./features/execute/routes.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { registerGrpcRoutes } from "./features/grpc/routes.js";
import { registerHealthRoutes } from "./features/health/routes.js";
import { registerMockRoutes } from "./features/mock/routes.js";
import { registerMockGrpcRoutes } from "./features/mock/grpc-mock.js";
import { registerGrpcRecordReplayRoutes } from "./features/mock/grpc-record-replay.js";
import { registerOAuth2Routes } from "./features/oauth2/routes.js";
import { registerProxyRoutes } from "./features/proxy/routes.js";
import { registerWebhookRoutes } from "./features/webhook/routes.js";
import { registerWebSocketRoutes } from "./features/websocket/routes.js";

export function createApp() {
  const app = new Hono();

  app.use("*", logger());
  app.use("*", cors());

  registerHealthRoutes(app);
  app.use("/api/execute/*", rateLimit());
  registerExecuteRoutes(app);
  // WS connect is more expensive than HTTP execute — tighter burst, slower refill.
  app.use("/api/websocket/connect", rateLimit(20, 2));
  registerWebSocketRoutes(app);
  app.use("/api/grpc/*", rateLimit(40, 2));
  registerGrpcRoutes(app);
  registerProxyRoutes(app);
  registerOAuth2Routes(app);
  registerMockRoutes(app);
  registerMockGrpcRoutes(app);
  registerGrpcRecordReplayRoutes(app);
  registerWebhookRoutes(app);

  return app;
}

export const app = createApp();
