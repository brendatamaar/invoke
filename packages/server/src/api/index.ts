import { HttpApi, OpenApi } from "@effect/platform";
import { ExecuteGroup } from "./groups/execute.js";
import { GrpcGroup } from "./groups/grpc.js";
import { HealthGroup } from "./groups/health.js";
import { MockGroup } from "./groups/mock.js";
import { MockGrpcGroup } from "./groups/mock-grpc.js";
import { MockGrpcRecordGroup } from "./groups/mock-grpc-record.js";
import { OAuth2Group } from "./groups/oauth2.js";
import { ProxyGroup } from "./groups/proxy.js";
import { WebSocketGroup } from "./groups/websocket.js";
import { WebhookGroup } from "./groups/webhook.js";

export const InvokeApi = HttpApi.make("invoke")
  .add(HealthGroup)
  .add(ExecuteGroup)
  .add(ProxyGroup)
  .add(OAuth2Group)
  .add(MockGroup)
  .add(MockGrpcGroup)
  .add(MockGrpcRecordGroup)
  .add(WebhookGroup)
  .add(WebSocketGroup)
  .add(GrpcGroup)
  .annotateContext(
    OpenApi.annotations({
      title: "invoke",
      version: "1.0.0",
      description: "REST control plane for the invoke desktop client.",
    }),
  );
