import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { GrpcCallError, RateLimitedError } from "../../errors.js";
import { executeSchema } from "../../features/execute/schema.js";
import { RateLimitExecute } from "../../middleware/rate-limit.js";

const JsonResponse = Schema.Unknown;

export const ExecuteGroup = HttpApiGroup.make("execute")
  .addError(RateLimitedError, { status: 429 })
  .middleware(RateLimitExecute)
  .add(
    HttpApiEndpoint.post("execute", "/api/execute")
      .setPayload(executeSchema)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.post("stream", "/api/execute/stream")
      .setPayload(executeSchema)
      .addError(GrpcCallError, { status: 502 }),
  );
