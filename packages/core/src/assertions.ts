import Ajv, { type ErrorObject } from "ajv";
import { JSONPath } from "jsonpath-plus";
import type { Assertion, AssertionMatcher, AssertionResult, ExecuteResponse, KeyValue } from "./types";

const ajv = new Ajv({ allErrors: true, strict: false });

export function runAssertions(response: ExecuteResponse, assertions: Assertion[] = []): AssertionResult[] {
  return assertions.filter((assertion) => assertion.enabled !== false).map((assertion) => runAssertion(response, assertion));
}

interface AssertionEvaluation {
  actual: unknown;
  expected: unknown;
  schemaPassed?: boolean;
  details?: ErrorObject[];
}

function runAssertion(response: ExecuteResponse, assertion: Assertion): AssertionResult {
  try {
    const evaluation = evaluateAssertion(response, assertion);
    const passed =
      assertion.type === "bodySchema" ? Boolean(evaluation.schemaPassed) : match(evaluation.actual, assertion.matcher, evaluation.expected);
    return {
      assertionId: assertion.id,
      passed,
      actual: evaluation.actual,
      expected: evaluation.expected,
      message: passed ? "passed" : failureMessage(assertion, evaluation.actual, evaluation.expected, evaluation.details)
    };
  } catch (error) {
    return {
      assertionId: assertion.id,
      passed: false,
      actual: undefined,
      expected: assertion.expected,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

function evaluateAssertion(response: ExecuteResponse, assertion: Assertion): AssertionEvaluation {
  switch (assertion.type) {
    case "status":
      return { actual: response.status, expected: numericOrString(assertion.expected) };
    case "responseTime":
      return { actual: response.timing?.totalMs ?? 0, expected: Number(assertion.expected) };
    case "header":
      return { actual: headerValue(response.headers, assertion.expression), expected: assertion.expected };
    case "bodyJsonPath":
      return { actual: jsonPath(response.body, assertion.expression), expected: parseExpected(assertion.expected) };
    case "regex": {
      const pattern = assertion.expression.trim() || assertion.expected.trim();
      return { actual: response.body, expected: pattern };
    }
    case "bodySchema":
      return evaluateSchemaAssertion(response, assertion);
    default:
      return { actual: undefined, expected: assertion.expected };
  }
}

function evaluateSchemaAssertion(response: ExecuteResponse, assertion: Assertion) {
  const schemaText = assertion.expected.trim() || assertion.expression.trim();
  if (!schemaText) throw new Error("bodySchema assertion needs a JSON Schema");

  const schema = JSON.parse(schemaText) as object;
  const body = parseJson(response.body);
  const validate = ajv.compile(schema);
  const schemaPassed = validate(body);
  return {
    actual: schemaPassed ? "valid" : formatAjvErrors(validate.errors ?? []),
    expected: schema,
    schemaPassed,
    details: validate.errors ?? []
  };
}

function match(actual: unknown, matcher: AssertionMatcher, expected: unknown) {
  switch (matcher) {
    case "equals":
      return normalize(actual) === normalize(expected);
    case "notEquals":
      return normalize(actual) !== normalize(expected);
    case "exists":
      return actual !== undefined && actual !== null && actual !== "";
    case "gt":
      return Number(actual) > Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "contains":
      if (Array.isArray(actual)) return actual.some((item) => normalize(item) === normalize(expected));
      return String(actual ?? "").includes(String(expected ?? ""));
    case "matches":
      return regexFrom(String(expected ?? "")).test(String(actual ?? ""));
    default:
      return false;
  }
}

function failureMessage(assertion: Assertion, actual: unknown, expected: unknown, details?: unknown) {
  if (assertion.type === "bodySchema" && Array.isArray(details)) {
    return `schema mismatch: ${formatAjvErrors(details as ErrorObject[])}`;
  }
  if (assertion.matcher === "exists") return `expected ${label(assertion)} to exist`;
  return `expected ${label(assertion)} ${assertion.matcher} ${stringify(expected)}, got ${stringify(actual)}`;
}

function label(assertion: Assertion) {
  if (assertion.type === "status") return "status";
  if (assertion.type === "responseTime") return "response time";
  return assertion.expression || assertion.type;
}

function headerValue(headers: KeyValue[], name: string) {
  const normalized = name.trim().toLowerCase();
  return headers.find((header) => header.key.trim().toLowerCase() === normalized)?.value;
}

function jsonPath(body: string, path: string) {
  const json = parseJson(body);
  return JSONPath({ path, json, wrap: false }) as unknown;
}

function parseJson(body: string) {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("response body is not valid JSON");
  }
}

function parseExpected(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return numericOrString(trimmed);
  }
}

function numericOrString(value: string) {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) ? number : value;
}

function regexFrom(pattern: string) {
  const match = pattern.match(/^\/(.*)\/([dgimsuvy]*)$/);
  return match ? new RegExp(match[1], match[2]) : new RegExp(pattern);
}

function normalize(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function stringify(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function formatAjvErrors(errors: ErrorObject[]) {
  return errors.map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`).join("; ");
}
