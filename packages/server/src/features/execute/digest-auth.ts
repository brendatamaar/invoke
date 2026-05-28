import nodeCrypto from "node:crypto";
import type { ExecuteInput } from "../../types/index.js";
import { grpcCall } from "../../grpc/executor-client.js";
import { executePayload } from "./payload.js";

export async function executeDigest(input: ExecuteInput) {
  const first = await grpcCall<any>(
    "Execute",
    executePayload({
      ...input,
      headers: input.headers.filter((header) => header.key.toLowerCase() !== "authorization"),
    }),
  );
  const challenge = (first.headers ?? []).find(
    (header: any) => header.key?.toLowerCase() === "www-authenticate",
  )?.value as string | undefined;
  if (first.status !== 401 || !challenge?.toLowerCase().startsWith("digest")) return first;

  const authorization = digestAuthorizationHeader(input, challenge);
  return grpcCall<any>(
    "Execute",
    executePayload({
      ...input,
      headers: [
        ...input.headers.filter((header) => header.key.toLowerCase() !== "authorization"),
        { key: "Authorization", value: authorization, enabled: true },
      ],
    }),
  );
}

function digestAuthorizationHeader(input: ExecuteInput, challenge: string) {
  const auth = input.auth ?? { type: "digest" };
  const values = parseDigestChallenge(challenge);
  const realm = values.realm ?? "";
  const nonce = values.nonce ?? "";
  const algorithm = (values.algorithm ?? "MD5").toUpperCase();
  const qop = (values.qop ?? "")
    .split(",")
    .map((value) => value.trim())
    .find((value) => value === "auth");
  const uri = digestUri(input.url);
  const username = auth.username ?? "";
  const password = auth.password ?? "";
  const cnonce = nodeCrypto.randomBytes(12).toString("hex");
  const nc = "00000001";
  const hash = (value: string) =>
    nodeCrypto
      .createHash(algorithm === "SHA-256" ? "sha256" : "md5")
      .update(value)
      .digest("hex");
  const ha1 = hash(`${username}:${realm}:${password}`);
  const ha2 = hash(`${input.method.toUpperCase()}:${uri}`);
  const response = qop
    ? hash(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : hash(`${ha1}:${nonce}:${ha2}`);
  const parts = [
    `username="${escapeDigestValue(username)}"`,
    `realm="${escapeDigestValue(realm)}"`,
    `nonce="${escapeDigestValue(nonce)}"`,
    `uri="${escapeDigestValue(uri)}"`,
    `response="${response}"`,
    `algorithm=${algorithm}`,
  ];
  if (values.opaque) parts.push(`opaque="${escapeDigestValue(values.opaque)}"`);
  if (qop) parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  return `Digest ${parts.join(", ")}`;
}

function parseDigestChallenge(challenge: string) {
  const raw = challenge.replace(/^Digest\s+/i, "");
  const values: Record<string, string> = {};
  raw.replace(
    /([a-zA-Z0-9_-]+)=("(?:[^"\\]|\\.)*"|[^,]*)/g,
    (_match, key: string, value: string) => {
      values[key.toLowerCase()] = value.startsWith('"')
        ? value.slice(1, -1).replace(/\\"/g, '"')
        : value.trim();
      return "";
    },
  );
  return values;
}

function digestUri(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl;
  }
}

function escapeDigestValue(value: string) {
  return value.replace(/(["\\])/g, "\\$1");
}
