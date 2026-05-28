import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { mockGrpcCallSchema, mockGrpcRoutesSchema } from "../../features/mock/schema.js";

const JsonResponse = Schema.Unknown;

export const MockGrpcGroup = HttpApiGroup.make("mockGrpc")
  .add(HttpApiEndpoint.get("routes", "/api/mock-grpc/routes").addSuccess(JsonResponse))
  .add(
    HttpApiEndpoint.put("replaceRoutes", "/api/mock-grpc/routes")
      .setPayload(mockGrpcRoutesSchema)
      .addSuccess(JsonResponse),
  )
  .add(HttpApiEndpoint.del("clearLogs", "/api/mock-grpc/logs").addSuccess(JsonResponse))
  .add(
    HttpApiEndpoint.post("invoke", "/api/mock-grpc/invoke")
      .setPayload(mockGrpcCallSchema)
      .addSuccess(JsonResponse),
  );
