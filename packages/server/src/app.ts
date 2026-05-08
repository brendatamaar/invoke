import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { registerExecuteRoutes } from "./features/execute/routes.js";
import { registerGrpcRoutes } from "./features/grpc/routes.js";
import { registerHealthRoutes } from "./features/health/routes.js";
import { registerMockRoutes } from "./features/mock/routes.js";
import { registerOAuth2Routes } from "./features/oauth2/routes.js";
import { registerProxyRoutes } from "./features/proxy/routes.js";
import { registerWebhookRoutes } from "./features/webhook/routes.js";
import { registerWebSocketRoutes } from "./features/websocket/routes.js";

export function createApp() {
  const app = new Hono();

  app.use("*", logger());
  app.use("*", cors());

  registerHealthRoutes(app);
  registerExecuteRoutes(app);
  registerWebSocketRoutes(app);
  registerGrpcRoutes(app);
  registerProxyRoutes(app);
  registerOAuth2Routes(app);
  registerMockRoutes(app);
  registerWebhookRoutes(app);

  return app;
}

export const app = createApp();
