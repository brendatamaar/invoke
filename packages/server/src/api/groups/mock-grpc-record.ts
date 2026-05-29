import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { FixtureNotFoundError } from "../../errors.js";
import { startRecordingSchema } from "../../features/mock/schema.js";

const JsonResponse = Schema.Unknown;
const IdPath = Schema.Struct({ id: Schema.String });

export const MockGrpcRecordGroup = HttpApiGroup.make("mockGrpcRecord")
  .add(
    HttpApiEndpoint.post("start", "/api/mock-grpc/record/start")
      .setPayload(startRecordingSchema)
      .addSuccess(JsonResponse),
  )
  .add(HttpApiEndpoint.post("stop", "/api/mock-grpc/record/stop").addSuccess(JsonResponse))
  .add(HttpApiEndpoint.get("status", "/api/mock-grpc/record/status").addSuccess(JsonResponse))
  .add(HttpApiEndpoint.get("fixtures", "/api/mock-grpc/fixtures").addSuccess(JsonResponse))
  .add(
    HttpApiEndpoint.get("fixture", "/api/mock-grpc/fixtures/:id")
      .setPath(IdPath)
      .addSuccess(JsonResponse)
      .addError(FixtureNotFoundError, { status: 404 }),
  )
  .add(
    HttpApiEndpoint.del("deleteFixture", "/api/mock-grpc/fixtures/:id")
      .setPath(IdPath)
      .addSuccess(JsonResponse)
      .addError(FixtureNotFoundError, { status: 404 }),
  )
  .add(
    HttpApiEndpoint.post("replay", "/api/mock-grpc/fixtures/:id/replay")
      .setPath(IdPath)
      .addSuccess(JsonResponse)
      .addError(FixtureNotFoundError, { status: 404 }),
  );
