import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { GrpcCallError, RateLimitedError } from "../../errors.js";
import {
  grpcExecuteSchema,
  grpcReflectSchema,
  grpcStreamCloseSchema,
  grpcStreamEventsUrlParamsSchema,
  grpcStreamSendSchema,
} from "../../features/grpc/schema.js";
import { RateLimitGrpc } from "../../middleware/rate-limit.js";

const JsonResponse = Schema.Unknown;

export const GrpcGroup = HttpApiGroup.make("grpc")
  .addError(RateLimitedError, { status: 429 })
  .middleware(RateLimitGrpc)
  .add(
    HttpApiEndpoint.post("reflect", "/api/grpc/reflect")
      .setPayload(grpcReflectSchema)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.post("execute", "/api/grpc/execute")
      .setPayload(grpcExecuteSchema)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.post("serverStream", "/api/grpc/server-stream")
      .setPayload(grpcExecuteSchema)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.post("streamOpen", "/api/grpc/stream/open")
      .setPayload(grpcExecuteSchema)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.post("streamSend", "/api/grpc/stream/send")
      .setPayload(grpcStreamSendSchema)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.post("streamClose", "/api/grpc/stream/close")
      .setPayload(grpcStreamCloseSchema)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.get("streamEvents", "/api/grpc/stream/events")
      .setUrlParams(grpcStreamEventsUrlParamsSchema)
      .addError(GrpcCallError, { status: 502 }),
  );
