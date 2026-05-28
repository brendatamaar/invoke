import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { GrpcCallError } from "../../errors.js";

const HealthOk = Schema.Struct({ ok: Schema.Boolean });
const JsonResponse = Schema.Unknown;

export const HealthGroup = HttpApiGroup.make("health")
  .add(HttpApiEndpoint.get("health", "/health").addSuccess(HealthOk))
  .add(
    HttpApiEndpoint.get("ping", "/api/ping")
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  );
