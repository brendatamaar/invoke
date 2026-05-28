import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { mockRoutesSchema } from "../../features/mock/schema.js";

const JsonResponse = Schema.Unknown;

export const MockGroup = HttpApiGroup.make("mock")
  .add(HttpApiEndpoint.get("routes", "/api/mock/routes").addSuccess(JsonResponse))
  .add(
    HttpApiEndpoint.put("replaceRoutes", "/api/mock/routes")
      .setPayload(mockRoutesSchema)
      .addSuccess(JsonResponse),
  )
  .add(HttpApiEndpoint.del("clearLogs", "/api/mock/logs").addSuccess(JsonResponse));
