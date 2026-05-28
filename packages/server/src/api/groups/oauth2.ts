import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import {
  oauth2AuthCodeStartSchema,
  oauth2ClientCredentialsSchema,
  oauth2RefreshTokenSchema,
} from "../../features/oauth2/schema.js";

const JsonResponse = Schema.Unknown;
const StatePath = Schema.Struct({ state: Schema.String });

export const OAuth2Group = HttpApiGroup.make("oauth2")
  .add(
    HttpApiEndpoint.post("clientCredentials", "/api/oauth2/client-credentials")
      .setPayload(oauth2ClientCredentialsSchema)
      .addSuccess(JsonResponse),
  )
  .add(
    HttpApiEndpoint.post("authCodeStart", "/api/oauth2/auth-code/start")
      .setPayload(oauth2AuthCodeStartSchema)
      .addSuccess(JsonResponse),
  )
  .add(
    HttpApiEndpoint.get("authCodeResult", "/api/oauth2/auth-code/result/:state")
      .setPath(StatePath)
      .addSuccess(JsonResponse),
  )
  .add(
    HttpApiEndpoint.post("refreshToken", "/api/oauth2/refresh-token")
      .setPayload(oauth2RefreshTokenSchema)
      .addSuccess(JsonResponse),
  );
