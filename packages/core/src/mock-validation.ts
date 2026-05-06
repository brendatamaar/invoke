import type { KeyValue, MockRoute } from "./types";

/*
 * Mock route validation is shared by the UI and server so the client can give
 * fast feedback while the API still enforces the same rules.
 *
 * Blocking validations:
 * - Total config size must be <= MAX_TOTAL_CONFIG_BYTES.
 * - Route count must be <= MAX_ROUTES.
 * - Every route must have a non-empty id.
 * - Route ids must be unique.
 * - Path pattern must be non-empty.
 * - Path pattern must start with "/".
 * - Path pattern must not include protocol or host.
 * - Path pattern must not include query strings; use conditions for queries.
 * - Path pattern must not include URL fragments.
 * - Path pattern must not include unsupported wildcards.
 * - Path params must use ":name" with identifier-safe names.
 * - Path params must be unique within a route.
 * - Header name is required when a header value is set.
 * - Header names must be valid HTTP token names.
 * - Header values must not contain CR/LF characters.
 * - Restricted response headers cannot be set manually:
 *   Connection, Content-Length, Keep-Alive, Proxy-Authenticate,
 *   Proxy-Authorization, TE, Trailer, Transfer-Encoding, Upgrade.
 * - Response body size must be <= MAX_ROUTE_BODY_BYTES.
 * - JSON response bodies must parse when Content-Type includes "json" and the
 *   body has no runtime template placeholders.
 * - Template placeholders must have balanced "{{" and "}}" markers.
 * - "{{param.name}}" templates must reference an existing path parameter.
 * - "{{query.name}}" templates must include a query parameter name.
 * - Condition count per route must be <= MAX_CONDITIONS_PER_ROUTE.
 * - Condition expression is required.
 * - Header condition expression must be a valid HTTP header name.
 * - Query condition expression must be a plain parameter name, not "a=b" or a
 *   URL fragment/query string.
 * - Body JSONPath condition expression must use the supported simple JSONPath
 *   syntax.
 * - Expected value is required for every matcher except "exists".
 * - "gt" and "lt" expected values must be numeric.
 * - "matches" expected values must compile as regular expressions.
 *
 * Warning validations:
 * - HEAD routes should not include response bodies.
 * - 204, 205, and 304 routes should not include response bodies.
 * - Latency above 5000ms may make requests feel stalled.
 * - Active routes with the same method, path shape, and condition signature may
 *   overlap; later routes may never be reached.
 * - Duplicate enabled response headers may produce surprising responses.
 * - Templated JSON cannot be fully validated before runtime.
 * - Unknown template placeholders are returned unchanged at runtime.
 * - Body JSONPath conditions on GET/HEAD are unusual because those methods
 *   usually do not send request bodies.
 */

export interface MockValidationIssue {
  level: "error" | "warning";
  message: string;
  routeIndex?: number;
  routeId?: string;
}

export interface MockValidationResult {
  valid: boolean;
  errors: MockValidationIssue[];
  warnings: MockValidationIssue[];
}

const MAX_ROUTES = 500;
const MAX_CONDITIONS_PER_ROUTE = 20;
const MAX_ROUTE_BODY_BYTES = 1024 * 1024;
const MAX_TOTAL_CONFIG_BYTES = 2 * 1024 * 1024;
const HTTP_TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const PARAM_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const TEMPLATE_NAMES = new Set([
  "$uuid",
  "$randomUUID",
  "$timestamp",
  "$timestampMs",
  "$randomInt",
]);
const BODYLESS_STATUSES = new Set([204, 205, 304]);
const RESTRICTED_RESPONSE_HEADERS = new Set([
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export function validateMockRoutes(routes: MockRoute[]): MockValidationResult {
  const issues: MockValidationIssue[] = [];
  const seenIds = new Set<string>();
  const seenRouteKeys = new Map<string, number>();

  const add = (issue: MockValidationIssue) => issues.push(issue);
  const totalBytes = byteLength(JSON.stringify({ routes }));
  if (totalBytes > MAX_TOTAL_CONFIG_BYTES) {
    add({
      level: "error",
      message: `Mock configuration is too large (${formatBytes(totalBytes)}; max ${formatBytes(MAX_TOTAL_CONFIG_BYTES)})`,
    });
  }
  if (routes.length > MAX_ROUTES) {
    add({
      level: "error",
      message: `Too many mock routes (${routes.length}; max ${MAX_ROUTES})`,
    });
  }

  routes.forEach((route, routeIndex) => {
    const context = { routeIndex, routeId: route.id };
    if (!route.id?.trim()) {
      add({
        ...context,
        level: "error",
        message: `Route ${routeIndex + 1}: id is required`,
      });
    } else if (seenIds.has(route.id)) {
      add({
        ...context,
        level: "error",
        message: `Route ${routeIndex + 1}: id must be unique`,
      });
    } else {
      seenIds.add(route.id);
    }

    validatePathPattern(route, routeIndex, add);
    validateHeaders(route.headers ?? [], routeIndex, add);
    validateBody(route, routeIndex, add);
    validateConditions(route, routeIndex, add);

    if (route.method === "HEAD" && route.body.trim()) {
      add({
        ...context,
        level: "warning",
        message: `Route ${routeIndex + 1}: HEAD responses should not include a body`,
      });
    }
    if (BODYLESS_STATUSES.has(route.status) && route.body.trim()) {
      add({
        ...context,
        level: "warning",
        message: `Route ${routeIndex + 1}: status ${route.status} should not include a response body`,
      });
    }
    if ((route.latencyMs ?? 0) > 5000) {
      add({
        ...context,
        level: "warning",
        message: `Route ${routeIndex + 1}: latency above 5000ms may make requests feel stalled`,
      });
    }

    if (route.enabled === false) return;
    const routeKey = `${route.method} ${routeShape(route.pathPattern)} ${conditionSignature(route.conditions ?? [])}`;
    const previous = seenRouteKeys.get(routeKey);
    if (previous !== undefined) {
      add({
        ...context,
        level: "warning",
        message: `Route ${routeIndex + 1}: overlaps route ${previous + 1} and may never be reached`,
      });
    } else {
      seenRouteKeys.set(routeKey, routeIndex);
    }
  });

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");
  return { valid: errors.length === 0, errors, warnings };
}

function validatePathPattern(
  route: MockRoute,
  routeIndex: number,
  add: (issue: MockValidationIssue) => void,
) {
  const path = route.pathPattern.trim();
  const context = { routeIndex, routeId: route.id };
  if (!path) {
    add({
      ...context,
      level: "error",
      message: `Route ${routeIndex + 1}: path is required`,
    });
    return;
  }
  if (!path.startsWith("/"))
    add({
      ...context,
      level: "error",
      message: `Route ${routeIndex + 1}: path must start with /`,
    });
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(path))
    add({
      ...context,
      level: "error",
      message: `Route ${routeIndex + 1}: path must not include protocol or host`,
    });
  if (path.includes("?"))
    add({
      ...context,
      level: "error",
      message: `Route ${routeIndex + 1}: path must not include a query string; use conditions instead`,
    });
  if (path.includes("#"))
    add({
      ...context,
      level: "error",
      message: `Route ${routeIndex + 1}: path must not include a fragment`,
    });
  if (path.includes("*"))
    add({
      ...context,
      level: "error",
      message: `Route ${routeIndex + 1}: wildcards are not supported`,
    });

  const paramNames = new Set<string>();
  path
    .split("/")
    .filter(Boolean)
    .forEach((segment) => {
      if (!segment.startsWith(":")) return;
      const name = segment.slice(1);
      if (!PARAM_RE.test(name)) {
        add({
          ...context,
          level: "error",
          message: `Route ${routeIndex + 1}: invalid path parameter :${name || "(empty)"}`,
        });
      } else if (paramNames.has(name)) {
        add({
          ...context,
          level: "error",
          message: `Route ${routeIndex + 1}: duplicate path parameter :${name}`,
        });
      }
      paramNames.add(name);
    });
}

function validateHeaders(
  headers: KeyValue[],
  routeIndex: number,
  add: (issue: MockValidationIssue) => void,
) {
  const enabledNames = new Set<string>();
  headers.forEach((header, headerIndex) => {
    const key = header.key.trim();
    const value = header.value;
    const prefix = `Route ${routeIndex + 1}, header ${headerIndex + 1}`;
    if (!key && value.trim())
      add({
        routeIndex,
        level: "error",
        message: `${prefix}: name is required when value is set`,
      });
    if (key && !HTTP_TOKEN_RE.test(key))
      add({
        routeIndex,
        level: "error",
        message: `${prefix}: invalid header name`,
      });
    if (/[\r\n]/.test(value))
      add({
        routeIndex,
        level: "error",
        message: `${prefix}: value must not contain line breaks`,
      });
    if (header.enabled === false || !key) return;

    const lowerKey = key.toLowerCase();
    if (RESTRICTED_RESPONSE_HEADERS.has(lowerKey)) {
      add({
        routeIndex,
        level: "error",
        message: `${prefix}: ${key} is managed by the server and cannot be set manually`,
      });
    }
    if (enabledNames.has(lowerKey)) {
      add({
        routeIndex,
        level: "warning",
        message: `${prefix}: duplicate enabled header ${key}`,
      });
    }
    enabledNames.add(lowerKey);
  });
}

function validateBody(
  route: MockRoute,
  routeIndex: number,
  add: (issue: MockValidationIssue) => void,
) {
  const bodyBytes = byteLength(route.body);
  if (bodyBytes > MAX_ROUTE_BODY_BYTES) {
    add({
      routeIndex,
      routeId: route.id,
      level: "error",
      message: `Route ${routeIndex + 1}: response body is too large (${formatBytes(bodyBytes)}; max ${formatBytes(MAX_ROUTE_BODY_BYTES)})`,
    });
  }

  const templateNames = templatePlaceholders(route.body);
  validateTemplates(route, routeIndex, templateNames, add);

  const contentType = enabledHeader(route.headers ?? [], "content-type");
  if (!contentType?.toLowerCase().includes("json") || !route.body.trim())
    return;
  if (templateNames.length > 0) {
    add({
      routeIndex,
      routeId: route.id,
      level: "warning",
      message: `Route ${routeIndex + 1}: templated JSON cannot be fully validated before runtime`,
    });
    return;
  }
  try {
    JSON.parse(route.body);
  } catch {
    add({
      routeIndex,
      routeId: route.id,
      level: "error",
      message: `Route ${routeIndex + 1}: response body must be valid JSON for ${contentType}`,
    });
  }
}

function validateTemplates(
  route: MockRoute,
  routeIndex: number,
  names: string[],
  add: (issue: MockValidationIssue) => void,
) {
  const paramNames = new Set(
    route.pathPattern
      .split("/")
      .filter((segment) => segment.startsWith(":"))
      .map((segment) => segment.slice(1)),
  );
  const openCount = route.body.match(/\{\{/g)?.length ?? 0;
  const closeCount = route.body.match(/\}\}/g)?.length ?? 0;
  if (openCount !== closeCount) {
    add({
      routeIndex,
      routeId: route.id,
      level: "error",
      message: `Route ${routeIndex + 1}: malformed template placeholder`,
    });
  }
  names.forEach((name) => {
    if (name.startsWith("param.")) {
      const paramName = name.slice(6);
      if (!paramNames.has(paramName))
        add({
          routeIndex,
          routeId: route.id,
          level: "error",
          message: `Route ${routeIndex + 1}: template references unknown path parameter ${paramName}`,
        });
      return;
    }
    if (name.startsWith("query.")) {
      if (!name.slice(6).trim())
        add({
          routeIndex,
          routeId: route.id,
          level: "error",
          message: `Route ${routeIndex + 1}: query template name is required`,
        });
      return;
    }
    if (!TEMPLATE_NAMES.has(name)) {
      add({
        routeIndex,
        routeId: route.id,
        level: "warning",
        message: `Route ${routeIndex + 1}: unknown template placeholder {{${name}}} will be returned unchanged`,
      });
    }
  });
}

function validateConditions(
  route: MockRoute,
  routeIndex: number,
  add: (issue: MockValidationIssue) => void,
) {
  const conditions = route.conditions ?? [];
  if (conditions.length > MAX_CONDITIONS_PER_ROUTE) {
    add({
      routeIndex,
      routeId: route.id,
      level: "error",
      message: `Route ${routeIndex + 1}: too many conditions (${conditions.length}; max ${MAX_CONDITIONS_PER_ROUTE})`,
    });
  }
  conditions.forEach((condition, conditionIndex) => {
    const prefix = `Route ${routeIndex + 1}, condition ${conditionIndex + 1}`;
    const expression = condition.expression.trim();
    const expected = condition.expected.trim();
    if (!expression)
      add({
        routeIndex,
        routeId: route.id,
        level: "error",
        message: `${prefix}: expression is required`,
      });
    if (
      condition.source === "header" &&
      expression &&
      !HTTP_TOKEN_RE.test(expression)
    )
      add({
        routeIndex,
        routeId: route.id,
        level: "error",
        message: `${prefix}: invalid header name`,
      });
    if (condition.source === "query" && expression && /[=&?#]/.test(expression))
      add({
        routeIndex,
        routeId: route.id,
        level: "error",
        message: `${prefix}: query expression must be a parameter name`,
      });
    if (
      condition.source === "bodyJsonPath" &&
      expression &&
      !isSimpleJsonPath(expression)
    )
      add({
        routeIndex,
        routeId: route.id,
        level: "error",
        message: `${prefix}: invalid JSON path`,
      });
    if (
      condition.source === "bodyJsonPath" &&
      ["GET", "HEAD"].includes(route.method)
    )
      add({
        routeIndex,
        routeId: route.id,
        level: "warning",
        message: `${prefix}: ${route.method} requests usually do not have a body`,
      });

    if (condition.matcher !== "exists" && !expected)
      add({
        routeIndex,
        routeId: route.id,
        level: "error",
        message: `${prefix}: expected value is required for ${condition.matcher}`,
      });
    if (
      (condition.matcher === "gt" || condition.matcher === "lt") &&
      expected &&
      !Number.isFinite(Number(expected))
    )
      add({
        routeIndex,
        routeId: route.id,
        level: "error",
        message: `${prefix}: expected value must be numeric for ${condition.matcher}`,
      });
    if (condition.matcher === "matches") {
      try {
        new RegExp(condition.expected);
      } catch {
        add({
          routeIndex,
          routeId: route.id,
          level: "error",
          message: `${prefix}: expected value must be a valid regular expression`,
        });
      }
    }
  });
}

function enabledHeader(headers: KeyValue[], name: string) {
  return headers.find(
    (header) =>
      header.enabled !== false && header.key.trim().toLowerCase() === name,
  )?.value;
}

function templatePlaceholders(body: string) {
  return [...body.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) =>
    match[1].trim(),
  );
}

function conditionSignature(conditions: NonNullable<MockRoute["conditions"]>) {
  return conditions
    .map(
      (condition) =>
        `${condition.source}:${condition.expression}:${condition.matcher}:${condition.expected}`,
    )
    .sort()
    .join("|");
}

function routeShape(path: string) {
  return path
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => (segment.startsWith(":") ? ":" : segment))
    .join("/");
}

function isSimpleJsonPath(expression: string) {
  const trimmed = expression.trim();
  if (!trimmed || trimmed === "$") return true;
  const rest = trimmed.startsWith("$") ? trimmed.slice(1) : `.${trimmed}`;
  if (!rest) return true;
  const tokenRe = /(\.[A-Za-z_$][A-Za-z0-9_$]*|\[(\d+|(["'])[^"'\]]+\3)\])/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(rest))) {
    if (match.index !== cursor) return false;
    cursor = match.index + match[0].length;
  }
  return cursor === rest.length;
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${Math.ceil(bytes / (1024 * 1024))} MB`;
}
