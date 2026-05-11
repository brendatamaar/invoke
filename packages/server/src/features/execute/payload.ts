import type { ExecuteInput } from "../../types/index.js";
import { tlsClientConfigPayload } from "../shared/payload.js";

type Header = { key: string; value: string; enabled?: boolean };
type ExtraHeader = Header & { _soft?: boolean };

function serializeBody(
  input: ExecuteInput,
): { body: Buffer; extraHeaders: ExtraHeader[] } {
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
      return {
        body: Buffer.from(encoded),
        extraHeaders: [
          { key: "Content-Type", value: "application/x-www-form-urlencoded" },
        ],
      };
    } catch {
      return { body: Buffer.from(body), extraHeaders: [] };
    }
  }

  if (bodyMode === "file") {
    // body is a data URL: "data:<mime>;base64,<data>"
    const match = body.match(/^data:([^;]+);base64,(.+)$/s);
    if (match) {
      const [, mime, b64] = match;
      return {
        body: Buffer.from(b64, "base64"),
        extraHeaders: [{ key: "Content-Type", value: mime }],
      };
    }
    return { body: Buffer.from(body), extraHeaders: [] };
  }

  if (bodyMode === "graphql-multipart") {
    try {
      const { operations, map, files } = JSON.parse(body || "{}") as {
        operations: Record<string, unknown>;
        map: Record<string, string[]>;
        files: Array<{ field: string; filename: string; dataUrl: string }>;
      };
      const boundary = `----InvokeBoundary${Date.now().toString(16)}`;
      const parts: Buffer[] = [];

      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="operations"\r\n\r\n${JSON.stringify(operations)}\r\n`,
        ),
      );
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="map"\r\n\r\n${JSON.stringify(map)}\r\n`,
        ),
      );
      for (const file of files) {
        const match = file.dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
        if (!match) continue;
        const [, mime, b64] = match;
        parts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${file.field}"; filename="${file.filename}"\r\nContent-Type: ${mime}\r\n\r\n`,
          ),
        );
        parts.push(Buffer.from(b64, "base64"));
        parts.push(Buffer.from(`\r\n`));
      }
      parts.push(Buffer.from(`--${boundary}--\r\n`));
      return {
        body: Buffer.concat(parts),
        extraHeaders: [
          { key: "Content-Type", value: `multipart/form-data; boundary=${boundary}` },
        ],
      };
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

  // raw / no bodyMode: auto-infer content type so callers don't get octet-stream
  const trimmed = (body ?? "").trimStart();
  const isJsonBody =
    (trimmed.startsWith("{") || trimmed.startsWith("[")) &&
    (() => {
      try {
        JSON.parse(trimmed);
        return true;
      } catch {
        return false;
      }
    })();
  return {
    body: Buffer.from(body),
    extraHeaders: [
      {
        key: "Content-Type",
        value: isJsonBody ? "application/json" : "text/plain; charset=utf-8",
        _soft: true,
      } as Header & { _soft?: boolean },
    ],
  };
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

  for (const extra of extraHeaders) {
    const { _soft, ...header } = extra as Header & { _soft?: boolean };
    const hasContentType = headers.some(
      (h) => h.key.toLowerCase() === header.key.toLowerCase(),
    );
    if (_soft && hasContentType) continue; // user-set header wins
    headers = headers.filter(
      (h) => h.key.toLowerCase() !== header.key.toLowerCase(),
    );
    headers = [...headers, header];
  }

  const { headers: finalHeaders, url } = applyAuthIfNeeded(input, headers);

  // Inject connect/read timeout as stripped internal headers (Go executor reads + removes them)
  const transportHeaders = [...finalHeaders];
  if (input.connectTimeoutMs)
    transportHeaders.push({ key: "X-Invoke-Connect-Timeout-Ms", value: String(input.connectTimeoutMs) });
  if (input.readTimeoutMs)
    transportHeaders.push({ key: "X-Invoke-Read-Timeout-Ms", value: String(input.readTimeoutMs) });

  return {
    method: input.method,
    url,
    headers: transportHeaders,
    body,
    timeoutMs: input.timeoutMs,
    followRedirects: input.followRedirects,
    maxRedirects: input.maxRedirects,
    verifySsl: input.verifySsl,
    proxy: input.proxy,
    tlsClientConfig: tlsClientConfigPayload(input.tlsClientConfig),
  };
}
