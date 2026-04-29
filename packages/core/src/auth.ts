import type { KeyValue, RequestConfig } from "./types";

export interface AwsSigV4SignOptions {
  now?: Date;
}

export function applyAuth(request: RequestConfig): RequestConfig {
  const headers = [...request.headers];
  const params = [...request.params];
  const auth = request.auth ?? { type: "none" };
  if (auth.type === "basic" && auth.username != null) {
    headers.push({
      key: "Authorization",
      value: `Basic ${btoa(`${auth.username}:${auth.password ?? ""}`)}`,
      enabled: true
    });
  }
  if ((auth.type === "bearer" || auth.type === "oauth2") && auth.token) {
    headers.push({ key: "Authorization", value: `Bearer ${auth.token}`, enabled: true });
  }
  if (auth.type === "api-key" && auth.apiKeyName && auth.apiKeyValue) {
    const target = auth.apiKeyIn === "query" ? params : headers;
    target.push({ key: auth.apiKeyName, value: auth.apiKeyValue, enabled: true });
  }
  return { ...request, headers, params };
}

export async function signAwsSigV4Request(request: RequestConfig, options: AwsSigV4SignOptions = {}): Promise<RequestConfig> {
  const auth = request.auth;
  if (auth.type !== "aws-sigv4") return request;
  if (!auth.awsAccessKeyId || !auth.awsSecretAccessKey || !auth.awsRegion || !auth.awsService) {
    throw new Error("AWS SigV4 requires access key, secret key, region, and service");
  }

  const url = new URL(request.url);
  const now = options.now ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payload = request.bodyMode === "none" ? "" : request.body ?? "";
  const payloadHash = await sha256Hex(payload);
  const headers = request.headers.filter((header) => header.enabled !== false && header.key.trim() && header.key.toLowerCase() !== "authorization");
  const signingHeaders = new Map<string, string[]>();

  for (const header of headers) {
    const key = header.key.trim().toLowerCase();
    signingHeaders.set(key, [...(signingHeaders.get(key) ?? []), header.value.trim().replace(/\s+/g, " ")]);
  }
  signingHeaders.set("host", [url.host]);
  signingHeaders.set("x-amz-date", [amzDate]);
  if (auth.awsSessionToken) signingHeaders.set("x-amz-security-token", [auth.awsSessionToken]);

  const signedHeaderKeys = [...signingHeaders.keys()].sort();
  const canonicalHeaders = signedHeaderKeys.map((key) => `${key}:${(signingHeaders.get(key) ?? []).join(",")}\n`).join("");
  const signedHeaders = signedHeaderKeys.join(";");
  const canonicalRequest = [request.method, canonicalAwsPath(url), canonicalAwsQuery(url), canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${auth.awsRegion}/${auth.awsService}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, await sha256Hex(canonicalRequest)].join("\n");
  const signingKey = await awsSigningKey(auth.awsSecretAccessKey, dateStamp, auth.awsRegion, auth.awsService);
  const signature = await hmacHex(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${auth.awsAccessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const reserved = new Set(["host", "x-amz-date", "x-amz-security-token"]);

  return {
    ...request,
    headers: [
      ...headers.filter((header) => !reserved.has(header.key.trim().toLowerCase())),
      { key: "X-Amz-Date", value: amzDate, enabled: true },
      ...(auth.awsSessionToken ? [{ key: "X-Amz-Security-Token", value: auth.awsSessionToken, enabled: true }] : []),
      { key: "Authorization", value: authorization, enabled: true }
    ]
  };
}

export function buildUrl(rawUrl: string, params: KeyValue[]) {
  const enabled = params.filter((param) => param.enabled !== false && param.key.trim());
  if (enabled.length === 0) return rawUrl;
  try {
    const url = new URL(rawUrl);
    enabled.forEach((param) => url.searchParams.append(param.key, param.value));
    return url.toString();
  } catch {
    const query = enabled.map((param) => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`).join("&");
    return rawUrl + (rawUrl.includes("?") ? "&" : "?") + query;
  }
}

function canonicalAwsPath(url: URL) {
  return (
    "/" +
    url.pathname
      .replace(/^\/+/, "")
      .split("/")
      .map((part) => awsEncode(safeDecodeURIComponent(part)))
      .join("/")
  );
}

function canonicalAwsQuery(url: URL) {
  const pairs: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => pairs.push([key, value]));
  return pairs
    .map(([key, value]) => [awsEncode(key), awsEncode(value)] as [string, string])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

function awsEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function awsSigningKey(secret: string, dateStamp: string, region: string, service: string) {
  const dateKey = await hmacBytes(new TextEncoder().encode(`AWS4${secret}`), dateStamp);
  const regionKey = await hmacBytes(dateKey, region);
  const serviceKey = await hmacBytes(regionKey, service);
  return hmacBytes(serviceKey, "aws4_request");
}

async function hmacHex(key: Uint8Array, value: string) {
  return bytesToHex(await hmacBytes(key, value));
}

async function hmacBytes(key: Uint8Array, value: string) {
  const rawKey = new Uint8Array(key).buffer as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey("raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(value));
  return new Uint8Array(signature);
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
