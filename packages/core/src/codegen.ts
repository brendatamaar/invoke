import type { KeyValue, RequestConfig } from "./types";

export type CodeExportTarget = "curl" | "fetch" | "python-requests" | "node-axios";

export interface CodeSnippet {
  target: CodeExportTarget;
  label: string;
  language: "shell" | "javascript" | "python";
  filename: string;
  code: string;
}

export const CODE_EXPORT_TARGETS: Array<Omit<CodeSnippet, "code">> = [
  { target: "curl", label: "cURL", language: "shell", filename: "request.sh" },
  { target: "fetch", label: "JavaScript fetch", language: "javascript", filename: "request.fetch.js" },
  { target: "python-requests", label: "Python requests", language: "python", filename: "request.py" },
  { target: "node-axios", label: "Node axios", language: "javascript", filename: "request.axios.js" }
];

export async function generateCodeSnippet(request: RequestConfig, target: CodeExportTarget): Promise<CodeSnippet> {
  const meta = CODE_EXPORT_TARGETS.find((item) => item.target === target) ?? CODE_EXPORT_TARGETS[0];
  const code = await generatorFor(target)(request);
  return { ...meta, code };
}

function generatorFor(target: CodeExportTarget) {
  switch (target) {
    case "fetch":
      return generateFetch;
    case "python-requests":
      return generatePythonRequests;
    case "node-axios":
      return generateNodeAxios;
    default:
      return async (request: RequestConfig) => generateCurl(request);
  }
}

function generateCurl(request: RequestConfig) {
  const parts = ["curl", "-X", shellQuote(request.method), shellQuote(request.url)];
  for (const header of enabledHeaders(request.headers)) {
    parts.push("-H", shellQuote(`${header.key}: ${header.value}`));
  }
  if (hasBody(request)) {
    parts.push("--data-raw", shellQuote(request.body));
  }
  return parts.reduce((lines, part, index) => {
    if (index === 0) return part;
    return `${lines} \\\n  ${part}`;
  }, "");
}

async function generateFetch(request: RequestConfig) {
  const properties = [
    `method: ${jsString(request.method)}`,
    objectEntries(enabledHeaders(request.headers)).length ? `headers: ${jsObject(enabledHeadersObject(request.headers))}` : "",
    hasBody(request) ? `body: ${jsBodyExpression(request)}` : ""
  ].filter(Boolean);
  const source = `
const response = await fetch(${jsString(request.url)}, {
  ${properties.join(",\n  ")}
});

const body = await response.text();
console.log(response.status, body);
`;
  return formatJavaScript(source);
}

function generatePythonRequests(request: RequestConfig) {
  const method = request.method.toLowerCase();
  const headers = JSON.stringify(enabledHeadersObject(request.headers), null, 2);
  const imports = ["import requests"];
  const lines = [`url = ${JSON.stringify(request.url)}`, `headers = ${headers}`];
  const args = ["url", "headers=headers"];

  if (hasBody(request)) {
    if (request.bodyMode === "json" && isJsonObjectLike(request.body)) {
      imports.unshift("import json");
      lines.push(`payload = json.loads(${JSON.stringify(request.body)})`);
      args.push("json=payload");
    } else {
      lines.push(`payload = ${JSON.stringify(request.body)}`);
      args.push("data=payload");
    }
  }

  args.push(`timeout=${pythonTimeout(request.timeoutMs)}`);
  return `${imports.join("\n")}\n\n${lines.join("\n")}\n\nresponse = requests.${method}(\n    ${args.join(",\n    ")}\n)\nprint(response.status_code)\nprint(response.text)\n`;
}

async function generateNodeAxios(request: RequestConfig) {
  const properties = [
    `method: ${jsString(request.method)}`,
    `url: ${jsString(request.url)}`,
    objectEntries(enabledHeaders(request.headers)).length ? `headers: ${jsObject(enabledHeadersObject(request.headers))}` : "",
    hasBody(request) ? `data: ${jsDataExpression(request)}` : "",
    `timeout: ${request.timeoutMs}`
  ].filter(Boolean);
  const source = `
import axios from "axios";

const response = await axios({
  ${properties.join(",\n  ")}
});

console.log(response.status, response.data);
`;
  return formatJavaScript(source);
}

async function formatJavaScript(source: string) {
  try {
    const [prettier, babelPlugin, estreePlugin] = await Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree")
    ]);
    return prettier.format(source, {
      parser: "babel",
      plugins: [babelPlugin.default, estreePlugin.default],
      semi: true
    });
  } catch {
    return `${source.trim()}\n`;
  }
}

function hasBody(request: RequestConfig) {
  return request.bodyMode !== "none" && request.body.trim().length > 0;
}

function enabledHeaders(headers: KeyValue[]) {
  return headers.filter((header) => header.enabled !== false && header.key.trim());
}

function enabledHeadersObject(headers: KeyValue[]) {
  return Object.fromEntries(enabledHeaders(headers).map((header) => [header.key.trim(), header.value]));
}

function objectEntries(headers: KeyValue[]) {
  return headers.filter((header) => header.enabled !== false && header.key.trim());
}

function jsObject(value: Record<string, string>) {
  return JSON.stringify(value, null, 2);
}

function jsBodyExpression(request: RequestConfig) {
  if (request.bodyMode === "json" && isJsonObjectLike(request.body)) {
    return `JSON.stringify(${jsonExpression(request.body)})`;
  }
  return jsString(request.body);
}

function jsDataExpression(request: RequestConfig) {
  if (request.bodyMode === "json" && isJsonObjectLike(request.body)) return jsonExpression(request.body);
  return jsString(request.body);
}

function jsonExpression(value: string) {
  return JSON.stringify(JSON.parse(value), null, 2);
}

function isJsonObjectLike(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed !== null && typeof parsed === "object";
  } catch {
    return false;
  }
}

function jsString(value: string) {
  return JSON.stringify(value);
}

function shellQuote(value: string) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function pythonTimeout(timeoutMs: number) {
  return Math.max(1, Math.round(timeoutMs / 1000));
}
