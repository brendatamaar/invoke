import nodeCrypto from "node:crypto";
import type { Hono } from "hono";
import type {
  OAuth2AuthCodePending,
  OAuth2AuthCodeStartInput,
  OAuth2PendingResult,
} from "../../types/index.js";
import { parseJsonBody } from "../../lib/validate.js";
import {
  oauth2AuthCodeStartSchema,
  oauth2ClientCredentialsSchema,
  oauth2RefreshTokenSchema,
} from "./schema.js";

const oauth2Pending = new Map<string, OAuth2PendingResult>();

export function registerOAuth2Routes(app: Hono) {
  app.post("/api/oauth2/client-credentials", async (c) => {
    const parsed = await parseJsonBody(c, oauth2ClientCredentialsSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    if (input.scope.trim()) body.set("scope", input.scope.trim());
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (input.clientId || input.clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64")}`;
    }
    const tokenResponse = await fetch(input.tokenUrl, {
      method: "POST",
      headers,
      body,
    });
    const text = await tokenResponse.text();
    if (!tokenResponse.ok) {
      return c.json({ error: text || tokenResponse.statusText }, tokenResponse.status as any);
    }
    const payload = JSON.parse(text) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: string;
    };
    return c.json({
      accessToken: payload.access_token,
      tokenType: payload.token_type ?? "Bearer",
      expiresIn: payload.expires_in,
      error: payload.error,
    });
  });

  app.post("/api/oauth2/auth-code/start", async (c) => {
    const parsed = await parseJsonBody(c, oauth2AuthCodeStartSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data as unknown as OAuth2AuthCodeStartInput;
    const state = nodeCrypto.randomBytes(16).toString("hex");
    oauth2Pending.set(state, { status: "pending", timestamp: Date.now() });

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

    oauth2Pending.set(state, {
      status: "pending",
      timestamp: Date.now(),
      ...input,
      codeVerifier: input.pkce ? input.codeVerifier : undefined,
    });

    return c.json({ authUrl: url.toString(), state });
  });

  app.get("/api/oauth2/callback", async (c) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (!state) return c.html("<h3>Error: missing state parameter</h3>", 400);

    const pending = oauth2Pending.get(state) as OAuth2AuthCodePending | undefined;
    if (!pending) return c.html("<h3>Error: unknown state</h3>", 400);

    if (error) {
      oauth2Pending.set(state, {
        status: "error",
        error,
        timestamp: Date.now(),
      });
      return c.html(`<h3>Authorization failed: ${error}</h3><p>You can close this window.</p>`);
    }

    if (!code) {
      oauth2Pending.set(state, {
        status: "error",
        error: "missing code",
        timestamp: Date.now(),
      });
      return c.html("<h3>Error: missing authorization code</h3>");
    }

    try {
      const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: pending.redirectUri ?? "",
        client_id: pending.clientId ?? "",
      });
      if (pending.clientSecret) body.set("client_secret", pending.clientSecret);
      if (pending.pkce && pending.codeVerifier) body.set("code_verifier", pending.codeVerifier);

      const tokenRes = await fetch(pending.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${pending.clientId}:${pending.clientSecret}`).toString("base64")}`,
        },
        body,
      });
      const text = await tokenRes.text();
      const payload = JSON.parse(text) as {
        access_token?: string;
        refresh_token?: string;
        token_type?: string;
        expires_in?: number;
        error?: string;
      };

      if (!tokenRes.ok || payload.error) {
        oauth2Pending.set(state, {
          status: "error",
          error: payload.error || text,
          timestamp: Date.now(),
        });
        return c.html(
          `<h3>Token exchange failed</h3><pre>${payload.error ?? text}</pre><p>You can close this window.</p>`,
        );
      }

      oauth2Pending.set(state, {
        status: "done",
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token,
        tokenType: payload.token_type ?? "Bearer",
        expiresIn: payload.expires_in,
        timestamp: Date.now(),
      });

      return c.html(
        `<!DOCTYPE html><html><head><title>Authorization Successful</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center"><h2>✓ Authorization Successful</h2><p>You can close this window and return to invoke.</p><script>window.close();</script></body></html>`,
      );
    } catch (e) {
      oauth2Pending.set(state, {
        status: "error",
        error: String(e),
        timestamp: Date.now(),
      });
      return c.html(`<h3>Error: ${e}</h3><p>You can close this window.</p>`);
    }
  });

  app.get("/api/oauth2/auth-code/result/:state", (c) => {
    const state = c.req.param("state");
    const result = oauth2Pending.get(state);
    if (!result) return c.json({ status: "unknown" }, 404);
    if (result.status === "done" || result.status === "error") {
      oauth2Pending.delete(state);
    }
    return c.json(result);
  });

  app.post("/api/oauth2/refresh-token", async (c) => {
    const parsed = await parseJsonBody(c, oauth2RefreshTokenSchema);
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
    });
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    if (input.clientId || input.clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(
        `${input.clientId}:${input.clientSecret}`,
      ).toString("base64")}`;
    }
    const tokenResponse = await fetch(input.tokenUrl, {
      method: "POST",
      headers,
      body,
    });
    const text = await tokenResponse.text();
    if (!tokenResponse.ok) {
      return c.json({ error: text || tokenResponse.statusText }, tokenResponse.status as any);
    }
    const payload = JSON.parse(text) as {
      access_token?: string;
      refresh_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: string;
    };
    return c.json({
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      tokenType: payload.token_type ?? "Bearer",
      expiresIn: payload.expires_in,
      error: payload.error,
    });
  });
}
