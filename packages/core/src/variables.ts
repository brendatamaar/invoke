import { JSONPath } from "jsonpath-plus";
import { applyAuth, buildUrl } from "./auth";
import type { Environment, ExecuteResponse, ExtractionRule, RequestConfig } from "./types";

export function variablesFromEnvironment(environment?: Environment): Record<string, string> {
  return Object.fromEntries(
    (environment?.variables ?? [])
      .filter((item) => item.enabled !== false && item.key.trim())
      .map((item) => [item.key.trim(), item.value])
  );
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

export function resolveRequest(request: RequestConfig, environment?: Environment, sessionVariables: Record<string, string> = {}) {
  const variables = { ...variablesFromEnvironment(environment), ...sessionVariables };
  const unresolved = new Set<string>();
  const resolve = (value: string) => {
    const resolved = resolveTemplate(value, variables);
    resolved.unresolved.forEach((name) => unresolved.add(name));
    return resolved.value;
  };
  const withAuth = applyAuth(request);
  const resolved: RequestConfig = {
    ...withAuth,
    url: resolve(buildUrl(withAuth.url, withAuth.params)),
    headers: withAuth.headers.map((header) => ({ ...header, key: resolve(header.key), value: resolve(header.value) })),
    body: resolve(withAuth.body),
    auth: {
      ...withAuth.auth,
      username: resolve(withAuth.auth.username ?? ""),
      password: resolve(withAuth.auth.password ?? ""),
      token: resolve(withAuth.auth.token ?? ""),
      apiKeyName: resolve(withAuth.auth.apiKeyName ?? ""),
      apiKeyValue: resolve(withAuth.auth.apiKeyValue ?? "")
    }
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
