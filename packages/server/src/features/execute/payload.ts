import type { ExecuteInput } from "../../types/index.js";
import { tlsClientConfigPayload } from "../shared/payload.js";

type Header = { key: string; value: string; enabled?: boolean };

function serializeBody(
  input: ExecuteInput,
): { body: Buffer; extraHeaders: Header[] } {
  const { bodyMode, body } = input;

  if (bodyMode === "urlencoded") {
    try {
      const pairs = JSON.parse(body || "[]") as Array<{
        key: string;
        value: string;
        enabled?: boolean;
      }>;
      const encoded = pairs
        .filter((p) => p.enabled !== false && p.key)
        .map(
          (p) =>
            `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`,
        )
        .join("&");
      return { body: Buffer.from(encoded), extraHeaders: [] };
    } catch {
      return { body: Buffer.from(body), extraHeaders: [] };
    }
  }

  if (bodyMode === "form-data") {
    try {
      const pairs = JSON.parse(body || "[]") as Array<{
        key: string;
        value: string;
        enabled?: boolean;
      }>;
      const boundary = `----InvokeBoundary${Date.now().toString(16)}`;
      const parts: Buffer[] = [];
      for (const p of pairs) {
        if (p.enabled === false || !p.key) continue;
        parts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${p.key}"\r\n\r\n${p.value}\r\n`,
          ),
        );
      }
      parts.push(Buffer.from(`--${boundary}--\r\n`));
      return {
        body: Buffer.concat(parts),
        extraHeaders: [
          {
            key: "Content-Type",
            value: `multipart/form-data; boundary=${boundary}`,
          },
        ],
      };
    } catch {
      return { body: Buffer.from(body), extraHeaders: [] };
    }
  }

  return { body: Buffer.from(body), extraHeaders: [] };
}

function applyAuthIfNeeded(
  input: ExecuteInput,
  headers: Header[],
): { headers: Header[]; url: string } {
  const auth = input.auth;
  let url = input.url;
  if (!auth || auth.type === "none" || auth.type === "digest") {
    return { headers, url };
  }

  const headerKeySet = new Set(headers.map((h) => h.key.toLowerCase()));
  const newHeaders = [...headers];

  if (auth.type === "basic" && auth.username) {
    if (!headerKeySet.has("authorization")) {
      newHeaders.push({
        key: "Authorization",
        value: `Basic ${Buffer.from(
          `${auth.username}:${auth.password ?? ""}`,
        ).toString("base64")}`,
      });
    }
  } else if (
    (auth.type === "bearer" || auth.type === "oauth2") &&
    auth.token
  ) {
    if (!headerKeySet.has("authorization")) {
      newHeaders.push({ key: "Authorization", value: `Bearer ${auth.token}` });
    }
  } else if (auth.type === "api-key" && auth.apiKeyName && auth.apiKeyValue) {
    if (auth.apiKeyIn === "query") {
      try {
        const u = new URL(url);
        if (!u.searchParams.has(auth.apiKeyName)) {
          u.searchParams.append(auth.apiKeyName, auth.apiKeyValue);
          url = u.toString();
        }
      } catch {
        if (
          !url.includes(`${encodeURIComponent(auth.apiKeyName)}=`)
        ) {
          url +=
            (url.includes("?") ? "&" : "?") +
            `${encodeURIComponent(auth.apiKeyName)}=${encodeURIComponent(auth.apiKeyValue)}`;
        }
      }
    } else if (!headerKeySet.has(auth.apiKeyName.toLowerCase())) {
      newHeaders.push({ key: auth.apiKeyName, value: auth.apiKeyValue });
    }
  }

  return { headers: newHeaders, url };
}

export function executePayload(input: ExecuteInput) {
  let headers = input.headers.filter((h) => h.enabled !== false);

  const { body, extraHeaders } = serializeBody(input);

  if (extraHeaders.length > 0) {
    headers = headers.filter((h) => h.key.toLowerCase() !== "content-type");
    headers = [...headers, ...extraHeaders];
  }

  const { headers: finalHeaders, url } = applyAuthIfNeeded(input, headers);

  return {
    method: input.method,
    url,
    headers: finalHeaders,
    body,
    timeoutMs: input.timeoutMs,
    followRedirects: input.followRedirects,
    maxRedirects: input.maxRedirects,
    verifySsl: input.verifySsl,
    proxy: input.proxy,
    tlsClientConfig: tlsClientConfigPayload(input.tlsClientConfig),
  };
}
