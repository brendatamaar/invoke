import { expect, it } from "vitest";
import { Effect } from "effect";
import {
  makeTestClient,
  makeTestServer,
  runScoped,
  withGlobalFetch,
} from "../test-support/test-server.js";

it("exchanges OAuth2 client credentials", async () => {
  await runScoped(
    withGlobalFetch(
      async () =>
        new Response(
          JSON.stringify({
            access_token: "token-1",
            token_type: "Bearer",
            expires_in: 3600,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
    )(
      Effect.gen(function* () {
        const server = yield* makeTestServer();
        const client = yield* makeTestClient(server);

        const response = yield* client.oauth2.clientCredentials({
          payload: {
            tokenUrl: "http://issuer.test/token",
            clientId: "client",
            clientSecret: "secret",
            scope: "read",
          },
        });
        expect(response).toMatchObject({
          accessToken: "token-1",
          tokenType: "Bearer",
          expiresIn: 3600,
        });
      }),
    ),
  );
});

it("starts an auth-code flow and stores pending state", async () => {
  await runScoped(
    Effect.gen(function* () {
      const server = yield* makeTestServer();
      const client = yield* makeTestClient(server);

      const response = (yield* client.oauth2.authCodeStart({
        payload: {
          authUrl: "http://issuer.test/auth",
          tokenUrl: "http://issuer.test/token",
          clientId: "client",
          clientSecret: "",
          redirectUri: "http://localhost/api/oauth2/callback",
          scope: "openid profile",
          pkce: false,
          codeChallenge: "",
          codeChallengeMethod: "",
          codeVerifier: "",
        },
      })) as any;

      const authUrl = new URL(response.authUrl);
      expect(response.state).toBeTruthy();
      expect(authUrl.searchParams.get("client_id")).toBe("client");
      expect(authUrl.searchParams.get("state")).toBe(response.state);
      expect(authUrl.searchParams.get("scope")).toBe("openid profile");
    }),
  );
});
