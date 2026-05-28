import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { proxyRecordsToMocksSchema, proxySchema } from "../../features/proxy/schema.js";

const JsonResponse = Schema.Unknown;

export const ProxyGroup = HttpApiGroup.make("proxy")
  .add(
    HttpApiEndpoint.post("request", "/api/proxy/request")
      .setPayload(proxySchema)
      .addSuccess(JsonResponse),
  )
  .add(HttpApiEndpoint.get("records", "/api/proxy/records").addSuccess(JsonResponse))
  .add(HttpApiEndpoint.del("clearRecords", "/api/proxy/records").addSuccess(JsonResponse))
  .add(
    HttpApiEndpoint.post("recordsToMocks", "/api/proxy/records/to-mocks")
      .setPayload(proxyRecordsToMocksSchema)
      .addSuccess(JsonResponse),
  );
