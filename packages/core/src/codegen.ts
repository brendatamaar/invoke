import type {
  CodeExportTarget,
  CodeSnippet,
  KeyValue,
  RequestConfig,
  WebSocketRequestConfig,
  WsCodeExportTarget,
  WsCodeSnippet,
} from "./types";

export const CODE_EXPORT_TARGETS: Array<Omit<CodeSnippet, "code">> = [
  { target: "curl", label: "cURL", language: "shell", filename: "request.sh" },
  {
    target: "fetch",
    label: "JavaScript fetch",
    language: "javascript",
    filename: "request.fetch.js",
  },
  {
    target: "node-fetch",
    label: "Node fetch",
    language: "javascript",
    filename: "request.node-fetch.js",
  },
  {
    target: "python-requests",
    label: "Python requests",
    language: "python",
    filename: "request.py",
  },
  {
    target: "python-httpx",
    label: "Python httpx",
    language: "python",
    filename: "request.httpx.py",
  },
  {
    target: "node-axios",
    label: "Node axios",
    language: "javascript",
    filename: "request.axios.js",
  },
  {
    target: "go-net-http",
    label: "Go net/http",
    language: "shell",
    filename: "request.go",
  },
  {
    target: "java-okhttp",
    label: "Java OkHttp",
    language: "shell",
    filename: "Request.java",
  },
  {
    target: "kotlin-okhttp",
    label: "Kotlin OkHttp",
    language: "shell",
    filename: "Request.kt",
  },
  {
    target: "ruby-net-http",
    label: "Ruby Net::HTTP",
    language: "shell",
    filename: "request.rb",
  },
  {
    target: "php-guzzle",
    label: "PHP Guzzle",
    language: "shell",
    filename: "request.php",
  },
  {
    target: "csharp-httpclient",
    label: "C# HttpClient",
    language: "shell",
    filename: "Request.cs",
  },
  {
    target: "rust-reqwest",
    label: "Rust reqwest",
    language: "shell",
    filename: "request.rs",
  },
  {
    target: "powershell",
    label: "PowerShell",
    language: "shell",
    filename: "request.ps1",
  },
  {
    target: "httpie",
    label: "HTTPie",
    language: "shell",
    filename: "request.http",
  },
  {
    target: "graphql-fetch",
    label: "GraphQL fetch",
    language: "javascript",
    filename: "query.fetch.js",
  },
  {
    target: "graphql-apollo",
    label: "GraphQL Apollo",
    language: "javascript",
    filename: "query.apollo.tsx",
  },
  {
    target: "graphql-urql",
    label: "GraphQL urql",
    language: "javascript",
    filename: "query.urql.tsx",
  },
];

export async function generateCodeSnippet(
  request: RequestConfig,
  target: CodeExportTarget,
): Promise<CodeSnippet> {
  const meta =
    CODE_EXPORT_TARGETS.find((item) => item.target === target) ??
    CODE_EXPORT_TARGETS[0];
  const code = await generatorFor(target)(request);
  return { ...meta, code };
}

function generatorFor(target: CodeExportTarget) {
  switch (target) {
    case "fetch":
      return generateFetch;
    case "node-fetch":
      return generateNodeFetch;
    case "python-requests":
      return generatePythonRequests;
    case "python-httpx":
      return generatePythonHttpx;
    case "node-axios":
      return generateNodeAxios;
    case "go-net-http":
      return async (request: RequestConfig) => generateGoNetHttp(request);
    case "java-okhttp":
      return async (request: RequestConfig) => generateJavaOkHttp(request);
    case "kotlin-okhttp":
      return async (request: RequestConfig) => generateKotlinOkHttp(request);
    case "ruby-net-http":
      return async (request: RequestConfig) => generateRubyNetHttp(request);
    case "php-guzzle":
      return async (request: RequestConfig) => generatePhpGuzzle(request);
    case "csharp-httpclient":
      return async (request: RequestConfig) =>
        generateCSharpHttpClient(request);
    case "rust-reqwest":
      return async (request: RequestConfig) => generateRustReqwest(request);
    case "powershell":
      return async (request: RequestConfig) => generatePowerShell(request);
    case "httpie":
      return async (request: RequestConfig) => generateHttpie(request);
    case "graphql-fetch":
      return async (request: RequestConfig) => generateGraphQLFetch(request);
    case "graphql-apollo":
      return async (request: RequestConfig) => generateGraphQLApollo(request);
    case "graphql-urql":
      return async (request: RequestConfig) => generateGraphQLUrql(request);
    default:
      return async (request: RequestConfig) => generateCurl(request);
  }
}

function generateCurl(request: RequestConfig) {
  const parts = [
    "curl",
    "-X",
    shellQuote(request.method),
    shellQuote(request.url),
  ];
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
    objectEntries(enabledHeaders(request.headers)).length
      ? `headers: ${jsObject(enabledHeadersObject(request.headers))}`
      : "",
    hasBody(request) ? `body: ${jsBodyExpression(request)}` : "",
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

async function generateNodeFetch(request: RequestConfig) {
  const source = `
import fetch from "node-fetch";

${await generateFetch(request)}
`;
  return formatJavaScript(source);
}

function generatePythonRequests(request: RequestConfig) {
  const method = request.method.toLowerCase();
  const headers = JSON.stringify(
    enabledHeadersObject(request.headers),
    null,
    2,
  );
  const imports = ["import requests"];
  const lines = [
    `url = ${JSON.stringify(request.url)}`,
    `headers = ${headers}`,
  ];
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

function generatePythonHttpx(request: RequestConfig) {
  const method = request.method.toLowerCase();
  const headers = JSON.stringify(
    enabledHeadersObject(request.headers),
    null,
    2,
  );
  const imports = ["import httpx"];
  const lines = [
    `url = ${JSON.stringify(request.url)}`,
    `headers = ${headers}`,
  ];
  const args = ["url", "headers=headers"];

  if (hasBody(request)) {
    if (request.bodyMode === "json" && isJsonObjectLike(request.body)) {
      imports.unshift("import json");
      lines.push(`payload = json.loads(${JSON.stringify(request.body)})`);
      args.push("json=payload");
    } else {
      lines.push(`payload = ${JSON.stringify(request.body)}`);
      args.push("content=payload");
    }
  }

  args.push(`timeout=${pythonTimeout(request.timeoutMs)}`);
  return `${imports.join("\n")}\n\n${lines.join("\n")}\n\nwith httpx.Client() as client:\n    response = client.${method}(\n        ${args.join(",\n        ")}\n    )\n    print(response.status_code)\n    print(response.text)\n`;
}

async function generateNodeAxios(request: RequestConfig) {
  const properties = [
    `method: ${jsString(request.method)}`,
    `url: ${jsString(request.url)}`,
    objectEntries(enabledHeaders(request.headers)).length
      ? `headers: ${jsObject(enabledHeadersObject(request.headers))}`
      : "",
    hasBody(request) ? `data: ${jsDataExpression(request)}` : "",
    `timeout: ${request.timeoutMs}`,
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

function generateGoNetHttp(request: RequestConfig) {
  const headers = enabledHeaders(request.headers)
    .map(
      (header) =>
        `req.Header.Set(${goString(header.key)}, ${goString(header.value)})`,
    )
    .join("\n\t");
  const body = hasBody(request)
    ? `strings.NewReader(${goString(request.body)})`
    : "nil";
  const imports = ["fmt", "io", "net/http"];
  if (hasBody(request)) imports.push("strings");
  return `package main

import (
${imports.map((item) => `\t"${item}"`).join("\n")}
)

func main() {
\treq, err := http.NewRequest(${goString(request.method)}, ${goString(request.url)}, ${body})
\tif err != nil {
\t\tpanic(err)
\t}
${headers ? `\t${headers}\n` : ""}
\tclient := &http.Client{}
\tresp, err := client.Do(req)
\tif err != nil {
\t\tpanic(err)
\t}
\tdefer resp.Body.Close()

\tbody, err := io.ReadAll(resp.Body)
\tif err != nil {
\t\tpanic(err)
\t}
\tfmt.Println(resp.Status)
\tfmt.Println(string(body))
}
`;
}

function generateJavaOkHttp(request: RequestConfig) {
  const bodyLine = hasBody(request)
    ? `RequestBody body = RequestBody.create(${javaString(request.body)}, MediaType.parse(${javaString(contentType(request) || "text/plain")}));`
    : "RequestBody body = null;";
  const headers = enabledHeaders(request.headers).map(
    (header) =>
      `      .addHeader(${javaString(header.key)}, ${javaString(header.value)})`,
  );
  return `import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class RequestExample {
  public static void main(String[] args) throws Exception {
    OkHttpClient client = new OkHttpClient();
    ${bodyLine}
    Request request = new Request.Builder()
      .url(${javaString(request.url)})
${headers.length ? `${headers.join("\n")}\n` : ""}      .method(${javaString(request.method)}, body)
      .build();

    try (Response response = client.newCall(request).execute()) {
      System.out.println(response.code());
      System.out.println(response.body() != null ? response.body().string() : "");
    }
  }
}
`;
}

function generateKotlinOkHttp(request: RequestConfig) {
  const bodyLine = hasBody(request)
    ? `val body = ${kotlinString(request.body)}.toRequestBody(${kotlinString(contentType(request) || "text/plain")}.toMediaType())`
    : "val body = null";
  const headers = enabledHeaders(request.headers).map(
    (header) =>
      `    .addHeader(${kotlinString(header.key)}, ${kotlinString(header.value)})`,
  );
  return `import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody

fun main() {
  val client = OkHttpClient()
  ${bodyLine}
  val request = Request.Builder()
    .url(${kotlinString(request.url)})
${headers.length ? `${headers.join("\n")}\n` : ""}    .method(${kotlinString(request.method)}, body)
    .build()

  client.newCall(request).execute().use { response ->
    println(response.code)
    println(response.body?.string().orEmpty())
  }
}
`;
}

function generateRubyNetHttp(request: RequestConfig) {
  const requestClass = rubyRequestClass(request.method);
  const headers = enabledHeaders(request.headers)
    .map(
      (header) =>
        `request[${rubyString(header.key)}] = ${rubyString(header.value)}`,
    )
    .join("\n");
  return `require "net/http"
require "uri"

uri = URI(${rubyString(request.url)})
request = Net::HTTP::${requestClass}.new(uri)
${headers}
${hasBody(request) ? `request.body = ${rubyString(request.body)}` : ""}

response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
  http.request(request)
end

puts response.code
puts response.body
`;
}

function generatePhpGuzzle(request: RequestConfig) {
  const options: string[] = [];
  if (enabledHeaders(request.headers).length)
    options.push(
      `'headers' => ${phpArray(enabledHeadersObject(request.headers))}`,
    );
  if (hasBody(request)) options.push(`'body' => ${phpString(request.body)}`);
  return `<?php

require "vendor/autoload.php";

$client = new \\GuzzleHttp\\Client();
$response = $client->request(${phpString(request.method)}, ${phpString(request.url)}, [
${options.map((line) => `    ${line}`).join(",\n")}
]);

echo $response->getStatusCode() . PHP_EOL;
echo $response->getBody();
`;
}

function generateCSharpHttpClient(request: RequestConfig) {
  const headers = enabledHeaders(request.headers)
    .filter((header) => header.key.toLowerCase() !== "content-type")
    .map(
      (header) =>
        `request.Headers.TryAddWithoutValidation(${csharpString(header.key)}, ${csharpString(header.value)});`,
    )
    .join("\n");
  const content = hasBody(request)
    ? `request.Content = new StringContent(${csharpString(request.body)}, System.Text.Encoding.UTF8, ${csharpString(contentType(request) || "text/plain")});`
    : "";
  return `using System.Net.Http;

using var client = new HttpClient();
using var request = new HttpRequestMessage(HttpMethod.${csharpMethod(request.method)}, ${csharpString(request.url)});
${headers}
${content}

using var response = await client.SendAsync(request);
Console.WriteLine((int)response.StatusCode);
Console.WriteLine(await response.Content.ReadAsStringAsync());
`;
}

function generateRustReqwest(request: RequestConfig) {
  const headers = enabledHeaders(request.headers).map(
    (header) =>
      `        .header(${rustString(header.key)}, ${rustString(header.value)})`,
  );
  return `#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let response = client
        .request(reqwest::Method::${request.method}, ${rustString(request.url)})
${headers.length ? `${headers.join("\n")}\n` : ""}${hasBody(request) ? `        .body(${rustString(request.body)})\n` : ""}        .send()
        .await?;

    println!("{}", response.status());
    println!("{}", response.text().await?);
    Ok(())
}
`;
}

function generatePowerShell(request: RequestConfig) {
  const headers = enabledHeadersObject(request.headers);
  const headerLines = Object.entries(headers).map(
    ([key, value]) => `  ${powershellString(key)} = ${powershellString(value)}`,
  );
  return `$headers = @{
${headerLines.join("\n")}
}

$response = Invoke-RestMethod \`
  -Method ${request.method} \`
  -Uri ${powershellString(request.url)} \`
  -Headers $headers${hasBody(request) ? ` \`\n  -Body ${powershellString(request.body)}` : ""}

$response
`;
}

function generateHttpie(request: RequestConfig) {
  const parts = ["http", request.method, shellQuote(request.url)];
  for (const header of enabledHeaders(request.headers))
    parts.push(shellQuote(`${header.key}:${header.value}`));
  if (hasBody(request)) parts.push(shellQuote(request.body));
  return `${parts.join(" \\\n  ")}\n`;
}

async function formatJavaScript(source: string) {
  try {
    const [prettier, babelPlugin, estreePlugin] = await Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
    ]);
    return prettier.format(source, {
      parser: "babel",
      plugins: [babelPlugin.default, estreePlugin.default],
      semi: true,
    });
  } catch {
    return `${source.trim()}\n`;
  }
}

// ── GraphQL-specific generators ────────────────────────────────────────────

interface ParsedGQLBody {
  query: string;
  variables: Record<string, unknown> | null;
  operationName: string | null;
  operationKind: "query" | "mutation" | "subscription";
}

function parseGQLBody(request: RequestConfig): ParsedGQLBody | null {
  if (!hasBody(request)) return null;
  try {
    const parsed = JSON.parse(request.body) as {
      query?: string;
      variables?: unknown;
      operationName?: string;
    };
    if (!parsed.query) return null;
    const q = parsed.query.trim().replace(/^[\s\n]+/, "");
    const lower = q.toLowerCase();
    const operationKind: ParsedGQLBody["operationKind"] = lower.startsWith(
      "mutation",
    )
      ? "mutation"
      : lower.startsWith("subscription")
        ? "subscription"
        : "query";
    return {
      query: parsed.query,
      variables:
        parsed.variables !== null &&
        typeof parsed.variables === "object" &&
        !Array.isArray(parsed.variables)
          ? (parsed.variables as Record<string, unknown>)
          : null,
      operationName: parsed.operationName ?? null,
      operationKind,
    };
  } catch {
    return null;
  }
}

function gqlConstName(gql: ParsedGQLBody): string {
  if (gql.operationName) {
    return gql.operationName
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .toUpperCase();
  }
  return gql.operationKind.toUpperCase() + "_OPERATION";
}

async function generateGraphQLFetch(request: RequestConfig): Promise<string> {
  const gql = parseGQLBody(request);
  if (!gql) return generateFetch(request);

  const extraHeaders = enabledHeaders(request.headers).filter(
    (h) => h.key.toLowerCase() !== "content-type",
  );
  const hasVars =
    gql.variables !== null && Object.keys(gql.variables).length > 0;

  const headerLines = [
    `    "Content-Type": "application/json"`,
    ...extraHeaders.map((h) => `    ${jsString(h.key)}: ${jsString(h.value)}`),
  ].join(",\n");

  const bodyFields = [
    `    query: QUERY`,
    ...(hasVars ? [`    variables`] : []),
    ...(gql.operationName
      ? [`    operationName: ${jsString(gql.operationName)}`]
      : []),
  ].join(",\n");

  const source = `
const QUERY = \`
${gql.query.trim()}
\`;
${hasVars ? `\nconst variables = ${JSON.stringify(gql.variables, null, 2)};\n` : ""}
const response = await fetch(${jsString(request.url)}, {
  method: "POST",
  headers: {
${headerLines},
  },
  body: JSON.stringify({
${bodyFields},
  }),
});

const { data, errors } = await response.json();
console.log(data);
if (errors) console.error(errors);
`;
  return formatJavaScript(source);
}

async function generateGraphQLApollo(request: RequestConfig): Promise<string> {
  const gql = parseGQLBody(request);
  if (!gql) return generateFetch(request);

  const constName = gqlConstName(gql);
  const hasVars =
    gql.variables !== null && Object.keys(gql.variables).length > 0;
  const varStr = hasVars
    ? `,\n  variables: ${JSON.stringify(gql.variables, null, 2)}`
    : "";

  let hookImport: string;
  let hookUsage: string;
  if (gql.operationKind === "mutation") {
    hookImport = "useMutation";
    hookUsage = `const [${toCamelCase(constName)}, { data, loading, error }] = useMutation(${constName}${hasVars ? `, { variables: ${JSON.stringify(gql.variables, null, 2)} }` : ""});`;
  } else if (gql.operationKind === "subscription") {
    hookImport = "useSubscription";
    hookUsage = `const { data, loading, error } = useSubscription(${constName}${hasVars ? `${varStr.replace(/^,\n/, ", ")}` : ""});`;
  } else {
    hookImport = "useQuery";
    hookUsage = `const { data, loading, error } = useQuery(${constName}${varStr ? `{${varStr}\n}` : ""});`;
  }

  const source = `
import { gql, ${hookImport} } from "@apollo/client";

const ${constName} = gql\`
${gql.query.trim()}
\`;

// Inside your component:
${hookUsage}
`;
  return formatJavaScript(source);
}

async function generateGraphQLUrql(request: RequestConfig): Promise<string> {
  const gql = parseGQLBody(request);
  if (!gql) return generateFetch(request);

  const constName = gqlConstName(gql);
  const hasVars =
    gql.variables !== null && Object.keys(gql.variables).length > 0;

  let hookImport: string;
  let hookUsage: string;
  if (gql.operationKind === "mutation") {
    hookImport = "useMutation";
    hookUsage = `const [{ data, fetching, error }, execute] = useMutation(${constName});`;
    if (hasVars) {
      hookUsage += `\n// execute({ variables: ${JSON.stringify(gql.variables, null, 2)} });`;
    }
  } else if (gql.operationKind === "subscription") {
    hookImport = "useSubscription";
    hookUsage = `const [{ data, fetching, error }] = useSubscription({
  query: ${constName},${hasVars ? `\n  variables: ${JSON.stringify(gql.variables, null, 2)},` : ""}
});`;
  } else {
    hookImport = "useQuery";
    hookUsage = `const [{ data, fetching, error }] = useQuery({
  query: ${constName},${hasVars ? `\n  variables: ${JSON.stringify(gql.variables, null, 2)},` : ""}
});`;
  }

  const source = `
import { gql, ${hookImport} } from "urql";

const ${constName} = gql\`
${gql.query.trim()}
\`;

// Inside your component:
${hookUsage}
`;
  return formatJavaScript(source);
}

function toCamelCase(screaming: string): string {
  return screaming
    .toLowerCase()
    .replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function hasBody(request: RequestConfig) {
  return request.bodyMode !== "none" && request.body.trim().length > 0;
}

function enabledHeaders(headers: KeyValue[]) {
  return headers.filter(
    (header) => header.enabled !== false && header.key.trim(),
  );
}

function enabledHeadersObject(headers: KeyValue[]) {
  return Object.fromEntries(
    enabledHeaders(headers).map((header) => [header.key.trim(), header.value]),
  );
}

function objectEntries(headers: KeyValue[]) {
  return headers.filter(
    (header) => header.enabled !== false && header.key.trim(),
  );
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
  if (request.bodyMode === "json" && isJsonObjectLike(request.body))
    return jsonExpression(request.body);
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

function contentType(request: RequestConfig) {
  return (
    enabledHeaders(request.headers).find(
      (header) => header.key.toLowerCase() === "content-type",
    )?.value ?? ""
  );
}

function goString(value: string) {
  return JSON.stringify(value);
}

function javaString(value: string) {
  return JSON.stringify(value);
}

function kotlinString(value: string) {
  return JSON.stringify(value);
}

function rubyString(value: string) {
  return JSON.stringify(value);
}

function rustString(value: string) {
  return JSON.stringify(value);
}

function phpString(value: string) {
  return JSON.stringify(value);
}

function csharpString(value: string) {
  return `@"${value.replace(/"/g, '""')}"`;
}

function powershellString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function rubyRequestClass(method: string) {
  const normalized =
    method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
  return normalized === "Delete" ? "Delete" : normalized;
}

function csharpMethod(method: string) {
  const names: Record<string, string> = {
    DELETE: "Delete",
    GET: "Get",
    HEAD: "Head",
    OPTIONS: "Options",
    PATCH: "Patch",
    POST: "Post",
    PUT: "Put",
  };
  return names[method] ?? "Get";
}

function phpArray(value: Record<string, string>) {
  const entries = Object.entries(value).map(
    ([key, val]) => `${phpString(key)} => ${phpString(val)}`,
  );
  return `[${entries.join(", ")}]`;
}

// ─── WebSocket code generation ───────────────────────────────────────────────

export const WS_CODE_EXPORT_TARGETS: Array<Omit<WsCodeSnippet, "code">> = [
  { target: "ws-wscat", label: "wscat", language: "shell", filename: "websocket.sh" },
  { target: "ws-websocat", label: "websocat", language: "shell", filename: "websocket.sh" },
  { target: "ws-javascript", label: "Browser WebSocket", language: "javascript", filename: "websocket.js" },
  { target: "ws-node-ws", label: "Node.js ws", language: "javascript", filename: "websocket.node.js" },
  { target: "ws-python-websockets", label: "Python websockets", language: "python", filename: "websocket.py" },
];

export function generateWsCodeSnippet(
  request: WebSocketRequestConfig,
  target: WsCodeExportTarget,
): WsCodeSnippet {
  const meta = WS_CODE_EXPORT_TARGETS.find((t) => t.target === target) ?? WS_CODE_EXPORT_TARGETS[0];
  const code = wsGeneratorFor(target)(request);
  return { ...meta, code };
}

function wsGeneratorFor(target: WsCodeExportTarget) {
  switch (target) {
    case "ws-wscat": return generateWscat;
    case "ws-websocat": return generateWebsocat;
    case "ws-javascript": return generateWsJavaScript;
    case "ws-node-ws": return generateWsNodeWs;
    case "ws-python-websockets": return generateWsPython;
    default: return generateWscat;
  }
}

function wsEffectiveHeaders(request: WebSocketRequestConfig): Array<{ key: string; value: string }> {
  const headers = (request.headers ?? [])
    .filter((h) => h.enabled !== false && h.key)
    .map((h) => ({ key: h.key, value: h.value }));
  const auth = request.auth;
  if (!auth || auth.type === "none") return headers;
  if ((auth.type === "bearer" || auth.type === "oauth2") && auth.token) {
    headers.push({ key: "Authorization", value: `Bearer ${auth.token}` });
  } else if (auth.type === "basic" && auth.username) {
    const encoded = btoa(`${auth.username}:${auth.password ?? ""}`);
    headers.push({ key: "Authorization", value: `Basic ${encoded}` });
  } else if (auth.type === "api-key" && auth.apiKeyName && auth.apiKeyValue && auth.apiKeyIn !== "query") {
    headers.push({ key: auth.apiKeyName, value: auth.apiKeyValue });
  }
  return headers;
}

function generateWscat(request: WebSocketRequestConfig): string {
  const parts = ["wscat", "-c", shellQuote(request.url)];
  for (const h of wsEffectiveHeaders(request)) {
    parts.push("-H", shellQuote(`${h.key}: ${h.value}`));
  }
  if (request.protocols) {
    for (const p of request.protocols.split(",").map((s) => s.trim()).filter(Boolean)) {
      parts.push("--protocol", shellQuote(p));
    }
  }
  return parts.reduce((acc, part, i) => (i === 0 ? part : `${acc} \\\n  ${part}`), "");
}

function generateWebsocat(request: WebSocketRequestConfig): string {
  const parts = ["websocat", shellQuote(request.url)];
  for (const h of wsEffectiveHeaders(request)) {
    parts.push(`-H ${shellQuote(`${h.key}: ${h.value}`)}`);
  }
  return parts.reduce((acc, part, i) => (i === 0 ? part : `${acc} \\\n  ${part}`), "");
}

function generateWsJavaScript(request: WebSocketRequestConfig): string {
  const protocols = request.protocols
    ? `, ${JSON.stringify(request.protocols.split(",").map((p) => p.trim()).filter(Boolean))}`
    : "";
  const initMsg = request.message
    ? `\n  ws.send(${JSON.stringify(request.message)});`
    : "";
  return `const ws = new WebSocket(${JSON.stringify(request.url)}${protocols});

ws.onopen = () => {
  console.log("Connected");${initMsg}
};

ws.onmessage = (event) => {
  console.log("Received:", event.data);
};

ws.onerror = (error) => {
  console.error("Error:", error);
};

ws.onclose = (event) => {
  console.log("Closed:", event.code, event.reason);
};`;
}

function generateWsNodeWs(request: WebSocketRequestConfig): string {
  const hdrs = wsEffectiveHeaders(request);
  const headersObj = hdrs.length
    ? `\n  headers: ${JSON.stringify(Object.fromEntries(hdrs.map((h) => [h.key, h.value])), null, 4).replace(/\n/g, "\n  ")},`
    : "";
  const protocols = request.protocols
    ? `\n  protocols: ${JSON.stringify(request.protocols.split(",").map((p) => p.trim()).filter(Boolean))},`
    : "";
  const initMsg = request.message
    ? `\n  ws.send(${JSON.stringify(request.message)});`
    : "";
  const options = protocols || headersObj ? `, {${protocols}${headersObj}\n}` : "";
  return `import WebSocket from "ws";

const ws = new WebSocket(${JSON.stringify(request.url)}${options});

ws.on("open", () => {
  console.log("Connected");${initMsg}
});

ws.on("message", (data) => {
  console.log("Received:", data.toString());
});

ws.on("error", (err) => {
  console.error("Error:", err);
});

ws.on("close", (code, reason) => {
  console.log("Closed:", code, reason.toString());
});`;
}

function generateWsPython(request: WebSocketRequestConfig): string {
  const hdrs = wsEffectiveHeaders(request);
  const headersDict = hdrs.length
    ? `\nextra_headers = ${JSON.stringify(Object.fromEntries(hdrs.map((h) => [h.key, h.value])), null, 4)}\n`
    : "\nextra_headers = {}\n";
  const kwarg = hdrs.length ? ", additional_headers=extra_headers" : "";
  const initMsg = request.message
    ? `\n        await ws.send(${JSON.stringify(request.message)})`
    : "";
  return `import asyncio
import websockets
${headersDict}
async def main():
    async with websockets.connect(${JSON.stringify(request.url)}${kwarg}) as ws:${initMsg}
        async for message in ws:
            print("Received:", message)

asyncio.run(main())`;
}
