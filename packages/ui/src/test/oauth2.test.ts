import { describe, expect, it, vi } from "vitest";
import type { RequestConfig } from "@invoke/core";
import { applyOAuth2Token } from "../features/execution/oauth2";
import { oauth2ClientCredentials } from "../features/oauth2/api";

vi.mock("../features/oauth2/api", () => ({
  oauth2ClientCredentials: vi.fn(),
}));

const request: RequestConfig = {
  url: "https://api.example.com/users",
  method: "GET",
  params: [],
  headers: [],
  bodyMode: "none",
  body: "",
  auth: { type: "none" },
  timeoutMs: 30000,
};

describe("OAuth2 execution helper", () => {
  it("leaves non-OAuth2 requests unchanged", async () => {
    const warn = vi.fn();

    await expect(applyOAuth2Token(request, warn)).resolves.toBe(request);
    expect(warn).not.toHaveBeenCalled();
  });

  it("uses authorization-code access tokens as bearer auth", async () => {
    const warn = vi.fn();
    const updated = await applyOAuth2Token(
      {
        ...request,
        auth: {
          type: "oauth2",
          flow: "authorization_code",
          accessToken: "token_123",
          tokenExpiresAt: Date.now() + 60_000,
        },
      },
      warn,
    );

    expect(updated.auth).toMatchObject({
      type: "bearer",
      token: "token_123",
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns when using an expired authorization-code token", async () => {
    const warn = vi.fn();

    await applyOAuth2Token(
      {
        ...request,
        auth: {
          type: "oauth2",
          flow: "authorization_code",
          accessToken: "token_123",
          tokenExpiresAt: Date.now() - 1,
        },
      },
      warn,
    );

    expect(warn).toHaveBeenCalledWith(
      "OAuth2 token may be expired - re-authorize in the Auth tab",
    );
  });

  it("fetches client-credentials tokens and maps them to bearer auth", async () => {
    vi.mocked(oauth2ClientCredentials).mockResolvedValueOnce({
      accessToken: "client_token",
      tokenType: "Bearer",
    });

    const updated = await applyOAuth2Token(
      {
        ...request,
        auth: {
          type: "oauth2",
          flow: "client_credentials",
          tokenUrl: "https://auth.example.com/token",
          clientId: "client",
          clientSecret: "secret",
        },
      },
      vi.fn(),
    );

    expect(updated.auth).toMatchObject({
      type: "bearer",
      token: "client_token",
    });
  });
});
