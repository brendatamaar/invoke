import { emptyRequest } from "../request";
import type { HttpMethod, RequestConfig } from "../types";

const VALUE_FLAGS = new Set([
  "-o", "--output",
  "-A", "--user-agent",
  "-e", "--referer",
  "-m", "--max-time",
  "--connect-timeout",
  "-F", "--form", "--form-string",
  "-x", "--proxy",
  "--cert", "--key", "--cacert",
  "-c", "--cookie-jar",
  "--limit-rate",
  "--retry",
  "--resolve",
  "--interface",
  "--data-urlencode",
]);

export function parseCurl(command: string): Partial<RequestConfig> {
  const normalized = command.replace(/\\\r?\n/g, " ");
  const tokens =
    normalized.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s"']+/g)?.map(stripQuotes) ?? [];
  const request = emptyRequest();
  if (tokens[0]?.toLowerCase() !== "curl") return {};
  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "-X" || token === "--request") {
      request.method = tokens[++i]?.toUpperCase() as HttpMethod;
    } else if (token === "-H" || token === "--header") {
      const raw = tokens[++i] ?? "";
      const colonIdx = raw.indexOf(":");
      if (colonIdx !== -1) {
        request.headers.push({
          key: raw.slice(0, colonIdx).trim(),
          value: raw.slice(colonIdx + 1).trim(),
          enabled: true,
        });
      }
    } else if (["-d", "--data", "--data-raw", "--data-binary"].includes(token)) {
      request.method = request.method === "GET" ? "POST" : request.method;
      request.bodyMode = "raw";
      request.body = tokens[++i] ?? "";
    } else if (token === "-u" || token === "--user") {
      const credentials = tokens[++i] ?? "";
      const colonIdx = credentials.indexOf(":");
      request.auth = {
        type: "basic",
        username: colonIdx === -1 ? credentials : credentials.slice(0, colonIdx),
        password: colonIdx === -1 ? "" : credentials.slice(colonIdx + 1),
      };
    } else if (VALUE_FLAGS.has(token)) {
      i++;
    } else if (!token.startsWith("-")) {
      request.url = token;
    }
  }
  const authIdx = request.headers.findIndex((h) => h.key.toLowerCase() === "authorization");
  if (authIdx !== -1) {
    const authValue = request.headers[authIdx].value;
    if (authValue.toLowerCase().startsWith("bearer ")) {
      request.auth = { type: "bearer", token: authValue.slice(7) };
      request.headers.splice(authIdx, 1);
    }
  }
  return request;
}

function stripQuotes(value: string) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, "'");
    }
  }
  return value;
}
