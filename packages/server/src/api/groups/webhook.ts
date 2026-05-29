import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { webhookValidationSchema } from "../../features/webhook/schema.js";

const JsonResponse = Schema.Unknown;
const IdPath = Schema.Struct({ id: Schema.String });

export const WebhookGroup = HttpApiGroup.make("webhook")
  .add(
    HttpApiEndpoint.get("logs", "/api/webhook/:id/logs").setPath(IdPath).addSuccess(JsonResponse),
  )
  .add(
    HttpApiEndpoint.del("clearLogs", "/api/webhook/:id/logs")
      .setPath(IdPath)
      .addSuccess(JsonResponse),
  )
  .add(
    HttpApiEndpoint.put("config", "/api/webhook/:id/config")
      .setPath(IdPath)
      .setPayload(webhookValidationSchema)
      .addSuccess(JsonResponse),
  )
  .add(
    HttpApiEndpoint.del("deleteWebhook", "/api/webhook/:id")
      .setPath(IdPath)
      .addSuccess(JsonResponse),
  );
