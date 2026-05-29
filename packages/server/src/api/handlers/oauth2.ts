import nodeCrypto from "node:crypto";
import { HttpApiBuilder, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import type { OAuth2AuthCodeStartInput } from "../../types/index.js";
import { OAuth2Store } from "../../services/oauth2-store.js";
import { InvokeApi } from "../index.js";

type TokenPayload = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
};

const parseTokenPayload = (text: string): TokenPayload => JSON.parse(text);

export const OAuth2Live = HttpApiBuilder.group(InvokeApi, "oauth2", (handlers) =>
  handlers
    .handle("clientCredentials", ({ payload }) =>
      Effect.gen(function* () {
        const body = new URLSearchParams({ grant_type: "client_credentials" });
        if (payload.scope.trim()) body.set("scope", payload.scope.trim());
        const headers: Record<string, string> = {
          "Content-Type": "application/x-www-form-urlencoded",
        };
        if (payload.clientId || payload.clientSecret) {
          headers.Authorization = `Basic ${Buffer.from(
            `${payload.clientId}:${payload.clientSecret}`,
          ).toString("base64")}`;
        }
        const tokenResponse = yield* Effect.promise(() =>
          fetch(payload.tokenUrl, { method: "POST", headers, body }),
        );
        const text = yield* Effect.promise(() => tokenResponse.text());
        if (!tokenResponse.ok) {
          return HttpServerResponse.unsafeJson(
            { error: text || tokenResponse.statusText },
            { status: tokenResponse.status },
          );
        }
        const token = parseTokenPayload(text);
        return {
          accessToken: token.access_token,
          tokenType: token.token_type ?? "Bearer",
          expiresIn: token.expires_in,
          error: token.error,
        };
      }),
    )
    .handle("authCodeStart", ({ payload }) =>
      Effect.gen(function* () {
        const input = payload as OAuth2AuthCodeStartInput;
        const store = yield* OAuth2Store;
        const state = nodeCrypto.randomBytes(16).toString("hex");
        const url = new URL(input.authUrl);
        url.searchParams.set("response_type", "code");
        url.searchParams.set("client_id", input.clientId);
        url.searchParams.set("redirect_uri", input.redirectUri);
        url.searchParams.set("state", state);
        if (input.scope) url.searchParams.set("scope", input.scope);
        if (input.pkce && input.codeChallenge) {
          url.searchParams.set("code_challenge", input.codeChallenge);
          url.searchParams.set("code_challenge_method", input.codeChallengeMethod || "S256");
        }
        yield* store.set(state, {
          status: "pending",
          timestamp: Date.now(),
          ...input,
          codeVerifier: input.pkce ? input.codeVerifier : undefined,
        });
        return { authUrl: url.toString(), state };
      }),
    )
    .handle("authCodeResult", ({ path }) =>
      Effect.gen(function* () {
        const store = yield* OAuth2Store;
        const result = yield* store.getAndDeleteIfTerminal(path.state);
        if (!result) {
          return HttpServerResponse.unsafeJson({ status: "unknown" }, { status: 404 });
        }
        return result;
      }),
    )
    .handle("refreshToken", ({ payload }) =>
      Effect.gen(function* () {
        const body = new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: payload.refreshToken,
        });
        const headers: Record<string, string> = {
          "Content-Type": "application/x-www-form-urlencoded",
        };
        if (payload.clientId || payload.clientSecret) {
          headers.Authorization = `Basic ${Buffer.from(
            `${payload.clientId}:${payload.clientSecret}`,
          ).toString("base64")}`;
        }
        const tokenResponse = yield* Effect.promise(() =>
          fetch(payload.tokenUrl, { method: "POST", headers, body }),
        );
        const text = yield* Effect.promise(() => tokenResponse.text());
        if (!tokenResponse.ok) {
          return HttpServerResponse.unsafeJson(
            { error: text || tokenResponse.statusText },
            { status: tokenResponse.status },
          );
        }
        const token = parseTokenPayload(text);
        return {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          tokenType: token.token_type ?? "Bearer",
          expiresIn: token.expires_in,
          error: token.error,
        };
      }),
    ),
);
