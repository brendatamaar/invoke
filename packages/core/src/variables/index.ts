import { Effect, Option } from "effect";
import { JSONPath } from "jsonpath-plus";
import { applyAuth, buildUrl } from "../request/auth";
import { UndefinedVariableError } from "../errors";
import type {
  Environment,
  ExecuteResponse,
  ExtractionRule,
  ExtractionSource,
  GrpcRequestConfig,
  GraphQLRequestConfig,
  KeyValue,
  RequestConfig,
  VariableScope,
  WebSocketRequestConfig,
} from "../types";

const SENSITIVE_VARIABLE_RE =
  /(^|_)(secret|token|password|passwd|pwd|credential|credentials|private|auth|api[_-]?key|access[_-]?key|client[_-]?secret)($|_)/i;

export function variablesFromEnvironment(environment?: Environment): Record<string, string> {
  return variablesFromKeyValues(environment?.variables ?? []);
}

export function variablesFromScopes(scopes: VariableScope[]) {
  return scopes.reduce<Record<string, string>>((merged, scope) => {
    return { ...merged, ...variablesFromScope(scope) };
  }, {});
}

export function resolveTemplate(input: string, variables: Record<string, string>) {
  const unresolved = new Set<string>();
  const resolveOne = (value: string, depth = 0): string => {
    if (depth > 8) return value;
    return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawName: string) => {
      const name = rawName.trim();
      if (name.startsWith("$")) return dynamicVariable(name);
      const resolved = variables[name];
      if (resolved == null) {
        unresolved.add(name);
        return `{{${name}}}`;
      }
      return resolveOne(resolved, depth + 1);
    });
  };
  return { value: resolveOne(input), unresolved: [...unresolved] };
}

export function resolveRequest(
  request: RequestConfig,
  environmentOrScopes?: Environment | VariableScope[],
  sessionVariables: Record<string, string> = {},
) {
  const scopes = Array.isArray(environmentOrScopes)
    ? environmentOrScopes
    : [
        {
          name: "environment",
          variables: environmentOrScopes?.variables ?? [],
        },
        { name: "request", variables: request.variables ?? [] },
        { name: "session", variables: sessionVariables },
      ];
  const variables = variablesFromScopes(scopes);
  const unresolved = new Set<string>();
  const resolve = (value: string) => {
    const resolved = resolveTemplate(value, variables);
    resolved.unresolved.forEach((name) => unresolved.add(name));
    return resolved.value;
  };
  const resolvedBase: RequestConfig = {
    ...request,
    url: resolvePathVariables(resolve(request.url), request.pathVariables ?? []),
    params: request.params.map((param) => ({
      ...param,
      key: resolve(param.key),
      value: resolve(param.value),
    })),
    headers: request.headers.map((header) => ({
      ...header,
      key: resolve(header.key),
      value: resolve(header.value),
    })),
    body: resolve(request.body),
    auth: {
      ...request.auth,
      username: resolve(request.auth.username ?? ""),
      password: resolve(request.auth.password ?? ""),
      token: resolve(request.auth.token ?? ""),
      apiKeyName: resolve(request.auth.apiKeyName ?? ""),
      apiKeyValue: resolve(request.auth.apiKeyValue ?? ""),
      tokenUrl: resolve(request.auth.tokenUrl ?? ""),
      clientId: resolve(request.auth.clientId ?? ""),
      clientSecret: resolve(request.auth.clientSecret ?? ""),
      scope: resolve(request.auth.scope ?? ""),
      awsAccessKeyId: resolve(request.auth.awsAccessKeyId ?? ""),
      awsSecretAccessKey: resolve(request.auth.awsSecretAccessKey ?? ""),
      awsSessionToken: resolve(request.auth.awsSessionToken ?? ""),
      awsRegion: resolve(request.auth.awsRegion ?? ""),
      awsService: resolve(request.auth.awsService ?? ""),
      ntlmUsername: resolve(request.auth.ntlmUsername ?? ""),
      ntlmPassword: resolve(request.auth.ntlmPassword ?? ""),
      ntlmDomain: resolve(request.auth.ntlmDomain ?? ""),
    },
    options: resolveOptions(request.options, resolve),
  };
  const withAuth = applyAuth(resolvedBase);
  const baseUrl = stripQueryString(withAuth.url);
  return {
    request: { ...withAuth, url: buildUrl(baseUrl, withAuth.params) },
    unresolved: [...unresolved],
  };
}

export function resolveGraphQLRequest(
  request: GraphQLRequestConfig,
  environmentOrScopes?: Environment | VariableScope[],
  sessionVariables: Record<string, string> = {},
) {
  const scopes = Array.isArray(environmentOrScopes)
    ? environmentOrScopes
    : [
        {
          name: "environment",
          variables: environmentOrScopes?.variables ?? [],
        },
        { name: "session", variables: sessionVariables },
      ];
  const variables = variablesFromScopes(scopes);
  const unresolved = new Set<string>();
  const resolve = (value: string) => {
    const resolved = resolveTemplate(value, variables);
    resolved.unresolved.forEach((name) => unresolved.add(name));
    return resolved.value;
  };

  const resolved: GraphQLRequestConfig = {
    ...request,
    url: resolve(request.url),
    headers: request.headers.map((header) => ({
      ...header,
      key: resolve(header.key),
      value: resolve(header.value),
    })),
    query: resolve(request.query),
    variables: resolve(request.variables),
    operationName: resolve(request.operationName ?? ""),
    auth: {
      ...request.auth,
      username: resolve(request.auth.username ?? ""),
      password: resolve(request.auth.password ?? ""),
      token: resolve(request.auth.token ?? ""),
      apiKeyName: resolve(request.auth.apiKeyName ?? ""),
      apiKeyValue: resolve(request.auth.apiKeyValue ?? ""),
      tokenUrl: resolve(request.auth.tokenUrl ?? ""),
      clientId: resolve(request.auth.clientId ?? ""),
      clientSecret: resolve(request.auth.clientSecret ?? ""),
      scope: resolve(request.auth.scope ?? ""),
      awsAccessKeyId: resolve(request.auth.awsAccessKeyId ?? ""),
      awsSecretAccessKey: resolve(request.auth.awsSecretAccessKey ?? ""),
      awsSessionToken: resolve(request.auth.awsSessionToken ?? ""),
      awsRegion: resolve(request.auth.awsRegion ?? ""),
      awsService: resolve(request.auth.awsService ?? ""),
      ntlmUsername: resolve(request.auth.ntlmUsername ?? ""),
      ntlmPassword: resolve(request.auth.ntlmPassword ?? ""),
      ntlmDomain: resolve(request.auth.ntlmDomain ?? ""),
    },
    options: resolveOptions(request.options, resolve),
  };
  return { request: resolved, unresolved: [...unresolved] };
}

export function resolveWebSocketRequest(
  request: WebSocketRequestConfig,
  environmentOrScopes?: Environment | VariableScope[],
  sessionVariables: Record<string, string> = {},
) {
  const scopes = Array.isArray(environmentOrScopes)
    ? environmentOrScopes
    : [
        {
          name: "environment",
          variables: environmentOrScopes?.variables ?? [],
        },
        { name: "request", variables: request.variables ?? [] },
        { name: "session", variables: sessionVariables },
      ];
  const variables = variablesFromScopes(scopes);
  const unresolved = new Set<string>();
  const resolve = (value: string) => {
    const resolved = resolveTemplate(value, variables);
    resolved.unresolved.forEach((name) => unresolved.add(name));
    return resolved.value;
  };

  const resolved: WebSocketRequestConfig = {
    ...request,
    url: resolve(request.url),
    protocols: resolve(request.protocols ?? ""),
    headers: request.headers.map((header) => ({
      ...header,
      key: resolve(header.key),
      value: resolve(header.value),
    })),
    message: resolve(request.message),
    auth: {
      ...request.auth,
      username: resolve(request.auth.username ?? ""),
      password: resolve(request.auth.password ?? ""),
      token: resolve(request.auth.token ?? ""),
      apiKeyName: resolve(request.auth.apiKeyName ?? ""),
      apiKeyValue: resolve(request.auth.apiKeyValue ?? ""),
      tokenUrl: resolve(request.auth.tokenUrl ?? ""),
      clientId: resolve(request.auth.clientId ?? ""),
      clientSecret: resolve(request.auth.clientSecret ?? ""),
      scope: resolve(request.auth.scope ?? ""),
      awsAccessKeyId: resolve(request.auth.awsAccessKeyId ?? ""),
      awsSecretAccessKey: resolve(request.auth.awsSecretAccessKey ?? ""),
      awsSessionToken: resolve(request.auth.awsSessionToken ?? ""),
      awsRegion: resolve(request.auth.awsRegion ?? ""),
      awsService: resolve(request.auth.awsService ?? ""),
      ntlmUsername: resolve(request.auth.ntlmUsername ?? ""),
      ntlmPassword: resolve(request.auth.ntlmPassword ?? ""),
      ntlmDomain: resolve(request.auth.ntlmDomain ?? ""),
    },
    options: resolveOptions(request.options, resolve),
  };
  const withAuth = applyAuth({
    method: "GET",
    url: resolved.url,
    params: [],
    headers: resolved.headers,
    bodyMode: "none",
    body: "",
    auth: resolved.auth,
    timeoutMs: resolved.timeoutMs ?? 30000,
  });
  return {
    request: {
      ...resolved,
      url: buildUrl(withAuth.url, withAuth.params),
      headers: withAuth.headers,
    },
    unresolved: [...unresolved],
  };
}

export function resolveGrpcRequest(
  request: GrpcRequestConfig,
  environmentOrScopes?: Environment | VariableScope[],
  sessionVariables: Record<string, string> = {},
) {
  const scopes = Array.isArray(environmentOrScopes)
    ? environmentOrScopes
    : [
        {
          name: "environment",
          variables: environmentOrScopes?.variables ?? [],
        },
        { name: "request", variables: request.variables ?? [] },
        { name: "session", variables: sessionVariables },
      ];
  const variables = variablesFromScopes(scopes);
  const unresolved = new Set<string>();
  const resolve = (value: string) => {
    const resolved = resolveTemplate(value, variables);
    resolved.unresolved.forEach((name) => unresolved.add(name));
    return resolved.value;
  };

  const resolved: GrpcRequestConfig = {
    ...request,
    address: resolve(request.address),
    service: resolve(request.service),
    method: resolve(request.method),
    metadata: request.metadata.map((header) => ({
      ...header,
      key: resolve(header.key),
      value: resolve(header.value),
    })),
    body: resolve(request.body),
    options: resolveOptions(request.options, resolve),
  };
  return { request: resolved, unresolved: [...unresolved] };
}

export function extractVariables(response: ExecuteResponse, rules: ExtractionRule[]) {
  const values: Record<string, string> = {};
  let json: unknown;
  try {
    json = JSON.parse(response.body);
  } catch {
    json = undefined;
  }
  for (const rule of normalizeExtractionRules(rules)) {
    if (rule.enabled === false) continue;
    const variableName = rule.variableName;
    const source = rule.source ?? "body";
    const expression = rule.expression;
    if (!variableName.trim()) continue;
    const result = extractValue(response, source, expression, json);
    const value = result ?? rule.fallback;
    if (value != null)
      values[variableName.trim()] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return values;
}

export function normalizeExtractionRules(rules: unknown[] | undefined = []): ExtractionRule[] {
  return (rules ?? []).map((raw) => {
    const rule = raw as Partial<ExtractionRule> & {
      name?: string;
      jsonPath?: string;
    };
    return {
      id: rule.id,
      variableName: String(rule.variableName ?? rule.name ?? ""),
      source: rule.source ?? "body",
      expression: String(rule.expression ?? rule.jsonPath ?? ""),
      fallback: rule.fallback,
      enabled: rule.enabled ?? true,
    };
  });
}

export function isSensitiveVariableName(name: string) {
  return SENSITIVE_VARIABLE_RE.test(name.trim());
}

export function maskedValue(value: string) {
  if (!value) return "";
  return "*".repeat(Math.min(Math.max(value.length, 6), 12));
}

export function parseEnvText(text: string): KeyValue[] {
  const variables: KeyValue[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.replace(/^export\s+/, "");
    const eq = normalized.indexOf("=");
    if (eq === -1) continue;
    const key = normalized.slice(0, eq).trim();
    if (!key) continue;
    variables.push({
      key,
      value: parseEnvValue(normalized.slice(eq + 1).trim()),
      enabled: true,
      sensitive: isSensitiveVariableName(key),
    });
  }
  return variables;
}

export function exportEnvText(variables: KeyValue[], options: { includeSensitive?: boolean } = {}) {
  return variables
    .filter((item) => item.enabled !== false && item.key.trim())
    .filter((item) => options.includeSensitive || !item.sensitive)
    .map((item) => `${item.key.trim()}=${formatEnvValue(item.value)}`)
    .join("\n");
}

function parseEnvValue(raw: string) {
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    const inner = raw.slice(1, -1);
    if (raw.startsWith('"')) {
      return inner
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    return inner.replace(/\\'/g, "'");
  }
  return raw;
}

function formatEnvValue(value: string) {
  if (/^[^\s#"'\\]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function extractValue(
  response: ExecuteResponse,
  source: ExtractionSource,
  expression: string,
  json?: unknown,
) {
  if (source === "status") return response.status;
  if (source === "header") {
    const normalized = expression.trim().toLowerCase();
    return response.headers.find((header) => header.key.trim().toLowerCase() === normalized)?.value;
  }
  if (json == null || !expression.trim()) return undefined;
  return JSONPath({ path: expression, json, wrap: false }) as unknown;
}

function dynamicVariable(name: string) {
  switch (name) {
    case "$uuid":
      return crypto.randomUUID();
    case "$timestamp":
      return String(Math.floor(Date.now() / 1000));
    case "$timestampMs":
      return String(Date.now());
    case "$isoTimestamp":
      return new Date().toISOString();
    case "$randomInt":
      return String(Math.floor(Math.random() * 1000));
    case "$randomFloat":
      return String(Math.random());
    case "$randomUUID":
      return crypto.randomUUID();
    case "$randomEmail":
      return `user.${Math.floor(Math.random() * 100000)}@example.com`;
    case "$randomString":
      return Math.random().toString(36).slice(2, 18).padEnd(16, "x");
    case "$randomBoolean":
      return String(Math.random() >= 0.5);
    default: {
      // $grpcDeadline:<duration> — e.g. {{$grpcDeadline:5s}} → ISO timestamp 5s from now
      if (name.startsWith("$grpcDeadline:")) {
        const spec = name.slice("$grpcDeadline:".length).trim();
        const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)$/.exec(spec);
        if (match) {
          const val = parseFloat(match[1]);
          const unit = match[2];
          const ms =
            unit === "ms"
              ? val
              : unit === "s"
                ? val * 1000
                : unit === "m"
                  ? val * 60000
                  : val * 3600000;
          return new Date(Date.now() + ms).toISOString();
        }
      }
      return `{{${name}}}`;
    }
  }
}

function resolveOptions<T extends { options?: RequestConfig["options"] }["options"]>(
  options: T,
  resolve: (value: string) => string,
): T {
  if (!options) return options;
  return {
    ...options,
    proxy: options.proxy
      ? {
          ...options.proxy,
          url: resolve(options.proxy.url ?? ""),
          username: resolve(options.proxy.username ?? ""),
          password: resolve(options.proxy.password ?? ""),
        }
      : options.proxy,
    tlsClientConfig: options.tlsClientConfig
      ? {
          clientCertPem: resolve(options.tlsClientConfig.clientCertPem ?? ""),
          clientKeyPem: resolve(options.tlsClientConfig.clientKeyPem ?? ""),
          caCertPem: resolve(options.tlsClientConfig.caCertPem ?? ""),
          serverName: resolve(options.tlsClientConfig.serverName ?? ""),
        }
      : options.tlsClientConfig,
  } as T;
}

function variablesFromScope(scope: VariableScope) {
  if (Array.isArray(scope.variables)) return variablesFromKeyValues(scope.variables);
  return Object.fromEntries(
    Object.entries(scope.variables)
      .filter(([key]) => key.trim())
      .map(([key, value]) => [key.trim(), String(value)]),
  );
}

function variablesFromKeyValues(variables: KeyValue[]) {
  return Object.fromEntries(
    variables
      .filter((item) => item.enabled !== false && item.key.trim())
      .map((item) => [item.key.trim(), item.value]),
  );
}

export function extractPathVariableNames(url: string): string[] {
  const pathPart = url.split("?")[0].split("#")[0];
  return pathPart
    .split("/")
    .filter((s) => s.startsWith(":"))
    .map((s) => s.slice(1))
    .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));
}

function resolvePathVariables(url: string, pathVars: KeyValue[]): string {
  if (!pathVars.length) return url;
  const map = new Map(
    pathVars
      .filter((v) => v.enabled !== false && v.key && v.value)
      .map((v) => [v.key, encodeURIComponent(v.value)]),
  );
  if (!map.size) return url;
  return url.replace(
    /:([a-zA-Z_][a-zA-Z0-9_]*)(?=[/?#]|$)/g,
    (match, name: string) => map.get(name) ?? match,
  );
}

export function resolveTemplateEffect(
  template: string,
  variables: Record<string, string>,
): Effect.Effect<string, UndefinedVariableError> {
  const { value, unresolved } = resolveTemplate(template, variables);
  if (unresolved.length > 0) {
    return Effect.fail(new UndefinedVariableError({ name: unresolved[0], template }));
  }
  return Effect.succeed(value);
}

export function extractByJsonPath(body: unknown, path: string): Option.Option<string> {
  if (body == null || !path.trim()) return Option.none();
  const result = JSONPath({ path, json: body, wrap: false }) as unknown;
  if (result == null) return Option.none();
  return Option.some(typeof result === "string" ? result : JSON.stringify(result));
}

function stripQueryString(url: string) {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString();
  } catch {
    const idx = url.indexOf("?");
    return idx >= 0 ? url.slice(0, idx) : url;
  }
}
