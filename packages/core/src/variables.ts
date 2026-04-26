import { JSONPath } from "jsonpath-plus";
import { applyAuth, buildUrl } from "./auth";
import type { Environment, ExecuteResponse, ExtractionRule, KeyValue, RequestConfig } from "./types";

export interface VariableScope {
  name?: string;
  variables: KeyValue[] | Record<string, string>;
}

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
  sessionVariables: Record<string, string> = {}
) {
  const scopes = Array.isArray(environmentOrScopes)
    ? environmentOrScopes
    : [
        { name: "environment", variables: environmentOrScopes?.variables ?? [] },
        { name: "request", variables: request.variables ?? [] },
        { name: "session", variables: sessionVariables }
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
    url: resolve(request.url),
    params: request.params.map((param) => ({ ...param, key: resolve(param.key), value: resolve(param.value) })),
    headers: request.headers.map((header) => ({ ...header, key: resolve(header.key), value: resolve(header.value) })),
    body: resolve(request.body),
    auth: {
      ...request.auth,
      username: resolve(request.auth.username ?? ""),
      password: resolve(request.auth.password ?? ""),
      token: resolve(request.auth.token ?? ""),
      apiKeyName: resolve(request.auth.apiKeyName ?? ""),
      apiKeyValue: resolve(request.auth.apiKeyValue ?? "")
    }
  };
  const withAuth = applyAuth(resolvedBase);
  return { request: { ...withAuth, url: buildUrl(withAuth.url, withAuth.params) }, unresolved: [...unresolved] };
}

export function extractVariables(response: ExecuteResponse, rules: ExtractionRule[]) {
  const values: Record<string, string> = {};
  let json: unknown;
  try {
    json = JSON.parse(response.body);
  } catch {
    json = undefined;
  }
  for (const rule of rules) {
    if (!rule.name || !rule.jsonPath || json == null) continue;
    const result = JSONPath({ path: rule.jsonPath, json, wrap: false }) as unknown;
    if (result != null) values[rule.name] = typeof result === "string" ? result : JSON.stringify(result);
  }
  return values;
}

function dynamicVariable(name: string) {
  switch (name) {
    case "$uuid":
      return crypto.randomUUID();
    case "$timestamp":
      return String(Math.floor(Date.now() / 1000));
    case "$isoTimestamp":
      return new Date().toISOString();
    case "$randomInt":
      return String(Math.floor(Math.random() * 1000));
    default:
      return `{{${name}}}`;
  }
}

function variablesFromScope(scope: VariableScope) {
  if (Array.isArray(scope.variables)) return variablesFromKeyValues(scope.variables);
  return Object.fromEntries(
    Object.entries(scope.variables)
      .filter(([key]) => key.trim())
      .map(([key, value]) => [key.trim(), String(value)])
  );
}

function variablesFromKeyValues(variables: KeyValue[]) {
  return Object.fromEntries(
    variables
      .filter((item) => item.enabled !== false && item.key.trim())
      .map((item) => [item.key.trim(), item.value])
  );
}
