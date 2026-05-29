import { emptyRequest } from "../request";
import type { HttpMethod, RequestConfig } from "../types";

export function parseCurl(command: string): Partial<RequestConfig> {
  const tokens =
    command.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s"']+/g)?.map(stripQuotes) ?? [];
  const request = emptyRequest();
  if (tokens[0] !== "curl") return {};
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "-X" || token === "--request") {
      request.method = tokens[++i]?.toUpperCase() as HttpMethod;
    } else if (token === "-H" || token === "--header") {
      const [key, ...rest] = (tokens[++i] ?? "").split(":");
      request.headers.push({
        key: key.trim(),
        value: rest.join(":").trim(),
        enabled: true,
      });
    } else if (["-d", "--data", "--data-raw", "--data-binary"].includes(token)) {
      request.method = request.method === "GET" ? "POST" : request.method;
      request.bodyMode = "raw";
      request.body = tokens[++i] ?? "";
    } else if (!token.startsWith("-")) {
      request.url = token;
    }
  }
  const authHeader = request.headers.find((header) => header.key.toLowerCase() === "authorization");
  if (authHeader?.value.toLowerCase().startsWith("bearer ")) {
    request.auth = { type: "bearer", token: authHeader.value.slice(7) };
  }
  return request;
}

function stripQuotes(value: string) {
  return value
    .replace(/^["']|["']$/g, "")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}
