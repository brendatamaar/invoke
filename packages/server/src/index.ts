import { serve } from "@hono/node-server";
import { app } from "./app.js";

export { app };

const port = Number(process.env.PORT ?? 4000);

if (process.env.NODE_ENV !== "test") {
  serve({ fetch: app.fetch, port });
  console.log(`invoke server listening on http://localhost:${port}`);
}
