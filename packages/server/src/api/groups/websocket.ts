import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { GrpcCallError, RateLimitedError } from "../../errors.js";
import { RateLimitWsConnect } from "../../middleware/rate-limit.js";
import {
  webSocketCloseSchema,
  webSocketConnectSchema,
  webSocketPollSchema,
  webSocketSendSchema,
} from "../../features/websocket/schema.js";

const JsonResponse = Schema.Unknown;
const EventsUrlParams = Schema.Struct({ connectionId: Schema.String });

export const WebSocketGroup = HttpApiGroup.make("websocket")
  .addError(RateLimitedError, { status: 429 })
  .add(
    HttpApiEndpoint.post("connect", "/api/websocket/connect")
      .setPayload(webSocketConnectSchema)
      .middleware(RateLimitWsConnect)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.post("send", "/api/websocket/send")
      .setPayload(webSocketSendSchema)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.post("poll", "/api/websocket/poll")
      .setPayload(webSocketPollSchema)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.post("close", "/api/websocket/close")
      .setPayload(webSocketCloseSchema)
      .addSuccess(JsonResponse)
      .addError(GrpcCallError, { status: 502 }),
  )
  .add(
    HttpApiEndpoint.get("events", "/api/websocket/events")
      .setUrlParams(EventsUrlParams)
      .addError(GrpcCallError, { status: 502 }),
  );
