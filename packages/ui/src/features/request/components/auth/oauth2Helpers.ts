import { oauth2AuthCodeStart } from "../../../oauth2/api";
import type { AuthFormProps } from "./types";

type ToastFn = (kind: "success" | "error" | "info" | "warn", message: string) => void;

export async function startAuthorization(
  auth: AuthFormProps["auth"],
  setAuthorizing: (value: boolean) => void,
  setOauthState: (state: string) => void,
  addToast: ToastFn,
) {
  if (!auth.authUrl || !auth.tokenUrl || !auth.clientId) return;
  setAuthorizing(true);
  try {
    const redirectUri = auth.redirectUri ?? "http://localhost:4000/api/oauth2/callback";
    const pkce = auth.pkce
      ? await makePkceChallenge()
      : { codeVerifier: "", codeChallenge: "", codeChallengeMethod: "" };
    const { authUrl, state } = await oauth2AuthCodeStart({
      authUrl: auth.authUrl,
      tokenUrl: auth.tokenUrl,
      clientId: auth.clientId,
      clientSecret: auth.clientSecret ?? "",
      scope: auth.scope ?? "",
      redirectUri,
      pkce: auth.pkce ?? false,
      ...pkce,
    });
    window.open(authUrl, "_blank");
    setOauthState(state);
  } catch (error) {
    setAuthorizing(false);
    addToast("error", String(error));
  }
}

export async function makePkceChallenge() {
  const raw = new Uint8Array(43);
  crypto.getRandomValues(raw);
  const codeVerifier = toBase64Url(raw);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
  return {
    codeVerifier,
    codeChallenge: toBase64Url(new Uint8Array(digest)),
    codeChallengeMethod: "S256",
  };
}

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
