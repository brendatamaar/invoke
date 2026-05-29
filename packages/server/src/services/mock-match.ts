import type { KeyValue, MockRoute } from "@invoke/core";
import type { MockConditionRequest, MockPathMatch } from "../types/index.js";

export function findMockRouteMatch(
  routes: ReadonlyArray<MockRoute>,
  method: string,
  path: string,
  headers: KeyValue[],
  query: URLSearchParams,
  body: string,
) {
  for (const route of routes) {
    if (route.enabled === false || route.method !== method) continue;
    const match = matchPath(route.pathPattern, path);
    if (
      match.matched &&
      mockConditionsMatch(route.conditions ?? [], {
        headers,
        query,
        body,
      })
    ) {
      return { route, params: match.params };
    }
  }
  return null;
}

export function mockConditionsMatch(
  conditions: NonNullable<MockRoute["conditions"]>,
  request: MockConditionRequest,
) {
  if (conditions.length === 0) return true;
  let parsedBody: unknown;
  let parsedBodyReady = false;
  const bodyJson = () => {
    if (!parsedBodyReady) {
      parsedBodyReady = true;
      try {
        parsedBody = JSON.parse(request.body);
      } catch {
        parsedBody = undefined;
      }
    }
    return parsedBody;
  };

  return conditions.every((condition) => {
    const actual = mockConditionActual(condition, request, bodyJson);
    return compareMockValues(actual, condition.expected, condition.matcher);
  });
}

function mockConditionActual(
  condition: NonNullable<MockRoute["conditions"]>[number],
  request: MockConditionRequest,
  bodyJson: () => unknown,
) {
  if (condition.source === "header") {
    const name = condition.expression.trim().toLowerCase();
    return request.headers.find((header) => header.key.trim().toLowerCase() === name)?.value;
  }
  if (condition.source === "query") {
    return request.query.get(condition.expression.trim()) ?? undefined;
  }
  return readSimpleJsonPath(bodyJson(), condition.expression);
}

function compareMockValues(
  actual: unknown,
  expected: string,
  matcher: NonNullable<MockRoute["conditions"]>[number]["matcher"],
) {
  if (matcher === "exists") return actual !== undefined && actual !== null;
  if (actual === undefined || actual === null) return false;
  if (matcher === "notEquals") return String(actual) !== expected;
  if (matcher === "contains") return String(actual).includes(expected);
  if (matcher === "matches") {
    try {
      return new RegExp(`^(?:${expected})$`).test(String(actual));
    } catch {
      return false;
    }
  }
  if (matcher === "gt") return Number(actual) > Number(expected);
  if (matcher === "lt") return Number(actual) < Number(expected);
  return String(actual) === expected;
}

function readSimpleJsonPath(json: unknown, expression: string) {
  if (json == null) return undefined;
  const trimmed = expression.trim();
  if (!trimmed || trimmed === "$") return json;
  const tokens = trimmed
    .replace(/^\$\.?/, "")
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/\[['"]([^'"]+)['"]\]/g, ".$1")
    .split(".")
    .filter(Boolean);
  return tokens.reduce<unknown>((value, token) => {
    if (value == null) return undefined;
    if (Array.isArray(value) && /^\d+$/.test(token)) return value[Number(token)];
    if (typeof value === "object") return (value as Record<string, unknown>)[token];
    return undefined;
  }, json);
}

export function matchPath(pattern: string, path: string): MockPathMatch {
  const patternParts = normalizePath(pattern).split("/");
  const pathParts = normalizePath(path).split("/");
  const params: Record<string, string> = {};
  if (patternParts.length !== pathParts.length) return { matched: false, params };
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index];
    const actual = pathParts[index];
    if (expected.startsWith(":")) {
      params[expected.slice(1)] = safeDecodeURIComponent(actual);
      continue;
    }
    if (expected.toLowerCase() !== actual.toLowerCase()) return { matched: false, params: {} };
  }
  return { matched: true, params };
}

function normalizePath(path: string) {
  return path.replace(/^\/+|\/+$/g, "");
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function renderMockTemplate(
  body: string,
  params: Record<string, string>,
  query: URLSearchParams,
) {
  return body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, rawName: string) => {
    const name = rawName.trim();
    if (name.startsWith("param.")) return params[name.slice(6)] ?? "";
    if (name.startsWith("query.")) return query.get(name.slice(6)) ?? "";
    if (name === "$uuid" || name === "$randomUUID") return crypto.randomUUID();
    if (name === "$timestamp") return String(Math.floor(Date.now() / 1000));
    if (name === "$timestampMs") return String(Date.now());
    if (name === "$randomInt") return String(Math.floor(Math.random() * 1000));
    return `{{${name}}}`;
  });
}
