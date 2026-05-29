import { HttpApiBuilder } from "@effect/platform";

export const CorsHttpMiddlewareLive = HttpApiBuilder.middlewareCors({
  allowedOrigins:
    process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== "*"
      ? [process.env.CORS_ORIGIN]
      : () => true,
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86_400,
});
