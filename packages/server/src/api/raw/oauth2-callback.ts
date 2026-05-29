import { HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import { OAuth2Store } from "../../services/oauth2-store.js";
import type { OAuth2AuthCodePending } from "../../types/index.js";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const html = (body: string, status = 200) =>
  HttpServerResponse.setStatus(HttpServerResponse.html(body), status);

export const oauth2Callback = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const url = new URL(request.url, "http://_");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (!state) return html("<h3>Error: missing state parameter</h3>", 400);

  const store = yield* OAuth2Store;
  const pending = (yield* store.get(state)) as OAuth2AuthCodePending | undefined;
  if (!pending) return html("<h3>Error: unknown state</h3>", 400);

  if (error) {
    yield* store.set(state, {
      status: "error",
      error,
      timestamp: Date.now(),
    });
    return html(
      `<h3>Authorization failed: ${escapeHtml(error)}</h3><p>You can close this window.</p>`,
    );
  }

  if (!code) {
    yield* store.set(state, {
      status: "error",
      error: "missing code",
      timestamp: Date.now(),
    });
    return html("<h3>Error: missing authorization code</h3>");
  }

  const exchange = yield* Effect.tryPromise({
    try: async () => {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: pending.redirectUri ?? "",
        client_id: pending.clientId ?? "",
      });
      if (pending.clientSecret) body.set("client_secret", pending.clientSecret);
      if (pending.pkce && pending.codeVerifier) body.set("code_verifier", pending.codeVerifier);

      const response = await fetch(pending.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${pending.clientId}:${pending.clientSecret}`).toString("base64")}`,
        },
        body,
      });
      return {
        ok: response.ok,
        text: await response.text(),
      };
    },
    catch: (cause) => cause,
  }).pipe(Effect.either);

  if (exchange._tag === "Left") {
    yield* store.set(state, {
      status: "error",
      error: String(exchange.left),
      timestamp: Date.now(),
    });
    return html(
      `<h3>Error: ${escapeHtml(String(exchange.left))}</h3><p>You can close this window.</p>`,
    );
  }

  const { ok, text } = exchange.right;
  const payload = JSON.parse(text) as {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: string;
  };

  if (!ok || payload.error) {
    yield* store.set(state, {
      status: "error",
      error: payload.error || text,
      timestamp: Date.now(),
    });
    return html(
      `<h3>Token exchange failed</h3><pre>${escapeHtml(payload.error ?? text)}</pre><p>You can close this window.</p>`,
    );
  }

  yield* store.set(state, {
    status: "done",
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type ?? "Bearer",
    expiresIn: payload.expires_in,
    timestamp: Date.now(),
  });

  return html(
    `<!DOCTYPE html><html><head><title>Authorization Successful</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center"><h2>Authorization Successful</h2><p>You can close this window and return to invoke.</p><script>window.close();</script></body></html>`,
  );
});
