import { JSONPath } from "jsonpath-plus";
import type {
  Assertion,
  ExtractionRule,
  Flow,
  FlowCondition,
  FlowStep,
  KeyValue,
  RequestConfig,
} from "./types";

/*
 * Flow validation is shared by the UI and runner-facing callers so the editor
 * can provide fast feedback while core code still has a single validation
 * contract.
 *
 * Blocking validations:
 * - Flow name must be present and <= MAX_FLOW_NAME_LENGTH.
 * - Run validation requires at least one step; save validation allows empty
 *   draft flows but reports a warning.
 * - Total nested step count must be <= MAX_TOTAL_STEPS.
 * - Nesting depth must be <= MAX_NESTING_DEPTH.
 * - Every step must have a non-empty id.
 * - Step ids must be unique across the full nested flow.
 * - Every step must have a non-empty name <= MAX_STEP_NAME_LENGTH.
 * - Step type must be request, delay, condition, or loop.
 * - Request step URL must be present.
 * - Non-templated request URLs must be absolute http(s) URLs.
 * - Request method must be a supported HTTP method.
 * - Request timeout must be an integer between 1 and MAX_TIMEOUT_MS.
 * - Request header names must be valid HTTP token names when values are set.
 * - Request header values must not contain CR/LF characters.
 * - Request param keys are required when values are set.
 * - JSON request bodies must parse when bodyMode is json and the body has no
 *   runtime template placeholders.
 * - Request assertions must have valid ids, types, matchers, required
 *   expressions, required expected values except for exists, numeric gt/lt
 *   expected values, compilable regex patterns, and valid JSON schemas.
 * - Request extraction rules must have valid variable names, sources, required
 *   expressions where applicable, valid header names, and valid JSONPath body
 *   expressions.
 * - Delay values must be integers between 0 and MAX_DELAY_MS.
 * - Conditions must have valid sources and matchers.
 * - Condition expressions are required for variable/header/bodyJsonPath sources.
 * - Variable condition expressions must be safe flow variable names.
 * - Header condition expressions must be valid HTTP header names.
 * - Body JSONPath condition expressions must be valid JSONPath expressions.
 * - Condition expected values are required except for exists.
 * - Condition gt/lt expected values must be numeric.
 * - Condition matches expected values must compile as regular expressions.
 * - Condition thenSteps/elseSteps must be arrays.
 * - Loop count and maxIterations, when set, must be positive integers.
 * - Loop maxIterations must be <= MAX_LOOP_ITERATIONS.
 * - Conditional loops must use conditionMode while or until.
 * - Loops without a count or condition must set maxIterations, so they always
 *   have an explicit safety cap.
 *
 * Warning validations:
 * - Empty draft flows can be saved but cannot be run.
 * - Duplicate enabled request headers may produce surprising requests.
 * - bodyMode none with non-empty body means the body will be ignored.
 * - Long delays may make flows appear stalled.
 * - Status condition expressions are ignored.
 * - Status/header/body conditions before any request step depend on a previous
 *   response and may never match.
 * - Condition steps with empty then/else branches are no-ops.
 * - Loop steps with no nested steps are no-ops.
 * - Loop count greater than maxIterations means maxIterations wins.
 * - Conditional loops whose first check depends on a previous response may skip
 *   immediately if no earlier request exists.
 */

export interface FlowValidationIssue {
  level: "error" | "warning";
  message: string;
  stepId?: string;
  path?: string;
}

export interface FlowValidationResult {
  valid: boolean;
  errors: FlowValidationIssue[];
  warnings: FlowValidationIssue[];
}

export interface FlowValidationOptions {
  requireSteps?: boolean;
}

const MAX_FLOW_NAME_LENGTH = 120;
const MAX_STEP_NAME_LENGTH = 120;
const MAX_TOTAL_STEPS = 500;
const MAX_NESTING_DEPTH = 8;
const MAX_TIMEOUT_MS = 300000;
const MAX_DELAY_MS = 300000;
const LONG_DELAY_MS = 30000;
const MAX_LOOP_ITERATIONS = 1000;
const HTTP_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
const STEP_TYPES = new Set(["request", "delay", "condition", "loop"]);
const CONDITION_SOURCES = new Set([
  "variable",
  "status",
  "bodyJsonPath",
  "header",
]);
const ASSERTION_TYPES = new Set([
  "status",
  "responseTime",
  "header",
  "bodyJsonPath",
  "bodySchema",
  "regex",
]);
const EXTRACTION_SOURCES = new Set(["body", "header", "status"]);
const MATCHERS = new Set([
  "equals",
  "notEquals",
  "exists",
  "gt",
  "lt",
  "contains",
  "matches",
]);
const BODY_MODES = new Set(["none", "json", "form-data", "urlencoded", "raw"]);
const HTTP_TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const VARIABLE_NAME_RE =
  /^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/;

export function validateFlow(
  flow: Flow,
  options: FlowValidationOptions = {},
): FlowValidationResult {
  const issues: FlowValidationIssue[] = [];
  const stepIds = new Set<string>();
  const stats = { totalSteps: 0, maxDepth: 0 };
  const add = (issue: FlowValidationIssue) => issues.push(issue);

  if (!flow.name.trim())
    add({ level: "error", message: "Flow name is required" });
  if (flow.name.length > MAX_FLOW_NAME_LENGTH)
    add({
      level: "error",
      message: `Flow name must be ${MAX_FLOW_NAME_LENGTH} characters or less`,
    });
  if (!flow.steps.length) {
    add({
      level: options.requireSteps ? "error" : "warning",
      message: options.requireSteps
        ? "Flow has no steps"
        : "Flow has no steps yet",
    });
  }

  validateSteps(flow.steps, {
    add,
    stepIds,
    stats,
    depth: 1,
    path: "Step",
    hasPreviousRequest: false,
  });

  if (stats.totalSteps > MAX_TOTAL_STEPS)
    add({
      level: "error",
      message: `Flow has too many steps (${stats.totalSteps}; max ${MAX_TOTAL_STEPS})`,
    });
  if (stats.maxDepth > MAX_NESTING_DEPTH)
    add({
      level: "error",
      message: `Flow nesting is too deep (${stats.maxDepth}; max ${MAX_NESTING_DEPTH})`,
    });

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");
  return { valid: errors.length === 0, errors, warnings };
}

interface StepValidationContext {
  add: (issue: FlowValidationIssue) => void;
  stepIds: Set<string>;
  stats: { totalSteps: number; maxDepth: number };
  depth: number;
  path: string;
  hasPreviousRequest: boolean;
}

function validateSteps(steps: FlowStep[], context: StepValidationContext) {
  let hasPreviousRequest = context.hasPreviousRequest;
  steps.forEach((step, index) => {
    const stepPath = `${context.path} ${index + 1}`;
    validateStep(step, { ...context, path: stepPath, hasPreviousRequest });
    if (step.type === "request") hasPreviousRequest = true;
  });
}

function validateStep(step: FlowStep, context: StepValidationContext) {
  const { add, stepIds, stats, depth, path } = context;
  stats.totalSteps += 1;
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  if (!step.id?.trim())
    add({ level: "error", message: `${path}: id is required`, path });
  else if (stepIds.has(step.id))
    add({
      level: "error",
      message: `${path}: id must be unique`,
      stepId: step.id,
      path,
    });
  else stepIds.add(step.id);

  if (!step.name.trim())
    add({
      level: "error",
      message: `${path}: name is required`,
      stepId: step.id,
      path,
    });
  if (step.name.length > MAX_STEP_NAME_LENGTH)
    add({
      level: "error",
      message: `${path}: name must be ${MAX_STEP_NAME_LENGTH} characters or less`,
      stepId: step.id,
      path,
    });
  if (!STEP_TYPES.has(step.type))
    add({
      level: "error",
      message: `${path}: invalid step type`,
      stepId: step.id,
      path,
    });

  if (step.type === "request")
    validateRequestStep(step.request, context, step.id, path);
  if (step.type === "delay")
    validateDelayStep(step.delayMs, context, step.id, path);
  if (step.type === "condition") validateConditionStep(step, context, path);
  if (step.type === "loop") validateLoopStep(step, context, path);
}

function validateRequestStep(
  request: RequestConfig,
  context: StepValidationContext,
  stepId: string,
  path: string,
) {
  const { add } = context;
  if (!request.url.trim())
    add({
      level: "error",
      message: `${path}: request URL is required`,
      stepId,
      path,
    });
  else if (!hasTemplate(request.url) && !isHttpUrl(request.url))
    add({
      level: "error",
      message: `${path}: request URL must be an absolute http(s) URL`,
      stepId,
      path,
    });
  if (!HTTP_METHODS.has(request.method))
    add({
      level: "error",
      message: `${path}: invalid request method`,
      stepId,
      path,
    });
  validateIntegerRange(
    request.timeoutMs,
    1,
    MAX_TIMEOUT_MS,
    `${path}: timeout`,
    add,
    stepId,
    path,
  );
  if (!BODY_MODES.has(request.bodyMode))
    add({
      level: "error",
      message: `${path}: invalid body mode`,
      stepId,
      path,
    });
  validateHeaders(request.headers ?? [], `${path}, header`, add, stepId, path);
  validateParams(request.params ?? [], `${path}, param`, add, stepId, path);
  validateRequestBody(request, add, stepId, path);
  validateAssertions(request.assertions ?? [], add, stepId, path);
  validateExtractionRules(request.extractionRules ?? [], add, stepId, path);
}

function validateDelayStep(
  delayMs: number,
  context: StepValidationContext,
  stepId: string,
  path: string,
) {
  validateIntegerRange(
    delayMs,
    0,
    MAX_DELAY_MS,
    `${path}: delay`,
    context.add,
    stepId,
    path,
  );
  if (Number.isInteger(delayMs) && delayMs > LONG_DELAY_MS)
    context.add({
      level: "warning",
      message: `${path}: long delay may make the flow feel stalled`,
      stepId,
      path,
    });
}

function validateConditionStep(
  step: Extract<FlowStep, { type: "condition" }>,
  context: StepValidationContext,
  path: string,
) {
  validateCondition(step.condition, context, step.id, path);
  if (!Array.isArray(step.thenSteps))
    context.add({
      level: "error",
      message: `${path}: thenSteps must be an array`,
      stepId: step.id,
      path,
    });
  if (step.elseSteps !== undefined && !Array.isArray(step.elseSteps))
    context.add({
      level: "error",
      message: `${path}: elseSteps must be an array`,
      stepId: step.id,
      path,
    });
  if (
    (step.thenSteps?.length ?? 0) === 0 &&
    (step.elseSteps?.length ?? 0) === 0
  )
    context.add({
      level: "warning",
      message: `${path}: condition has no branch steps`,
      stepId: step.id,
      path,
    });
  validateSteps(step.thenSteps ?? [], {
    ...context,
    depth: context.depth + 1,
    path: `${path} then`,
    hasPreviousRequest: context.hasPreviousRequest,
  });
  validateSteps(step.elseSteps ?? [], {
    ...context,
    depth: context.depth + 1,
    path: `${path} else`,
    hasPreviousRequest: context.hasPreviousRequest,
  });
}

function validateLoopStep(
  step: Extract<FlowStep, { type: "loop" }>,
  context: StepValidationContext,
  path: string,
) {
  if (!Array.isArray(step.steps))
    context.add({
      level: "error",
      message: `${path}: loop steps must be an array`,
      stepId: step.id,
      path,
    });
  if ((step.steps?.length ?? 0) === 0)
    context.add({
      level: "warning",
      message: `${path}: loop has no steps`,
      stepId: step.id,
      path,
    });
  if (step.count !== undefined)
    validateIntegerRange(
      step.count,
      1,
      MAX_LOOP_ITERATIONS,
      `${path}: loop count`,
      context.add,
      step.id,
      path,
    );
  if (step.maxIterations !== undefined)
    validateIntegerRange(
      step.maxIterations,
      1,
      MAX_LOOP_ITERATIONS,
      `${path}: max iterations`,
      context.add,
      step.id,
      path,
    );
  if (
    step.count !== undefined &&
    step.maxIterations !== undefined &&
    step.count > step.maxIterations
  ) {
    context.add({
      level: "warning",
      message: `${path}: maxIterations is lower than count and will stop the loop first`,
      stepId: step.id,
      path,
    });
  }
  if (step.condition) {
    if (step.conditionMode !== "while" && step.conditionMode !== "until")
      context.add({
        level: "error",
        message: `${path}: conditionMode must be while or until`,
        stepId: step.id,
        path,
      });
    validateCondition(step.condition, context, step.id, path);
    if (conditionNeedsResponse(step.condition) && !context.hasPreviousRequest)
      context.add({
        level: "warning",
        message: `${path}: loop condition depends on a previous response before any request has run`,
        stepId: step.id,
        path,
      });
  } else if (step.count === undefined && step.maxIterations === undefined) {
    context.add({
      level: "error",
      message: `${path}: loop needs count, condition, or maxIterations`,
      stepId: step.id,
      path,
    });
  }
  validateSteps(step.steps ?? [], {
    ...context,
    depth: context.depth + 1,
    path: `${path} loop`,
    hasPreviousRequest: context.hasPreviousRequest,
  });
}

function validateCondition(
  condition: FlowCondition,
  context: StepValidationContext,
  stepId: string,
  path: string,
) {
  const { add } = context;
  const expression = condition.expression.trim();
  const expected = condition.expected.trim();
  if (!CONDITION_SOURCES.has(condition.source))
    add({
      level: "error",
      message: `${path}: invalid condition source`,
      stepId,
      path,
    });
  if (!MATCHERS.has(condition.matcher))
    add({
      level: "error",
      message: `${path}: invalid condition matcher`,
      stepId,
      path,
    });
  if (condition.source === "status" && expression)
    add({
      level: "warning",
      message: `${path}: status condition expression is ignored`,
      stepId,
      path,
    });
  if (
    condition.source === "variable" &&
    (!expression || !VARIABLE_NAME_RE.test(expression))
  )
    add({
      level: "error",
      message: `${path}: variable condition needs a valid variable name`,
      stepId,
      path,
    });
  if (
    condition.source === "header" &&
    (!expression || !HTTP_TOKEN_RE.test(expression))
  )
    add({
      level: "error",
      message: `${path}: header condition needs a valid header name`,
      stepId,
      path,
    });
  if (
    condition.source === "bodyJsonPath" &&
    (!expression || !isJsonPath(expression))
  )
    add({
      level: "error",
      message: `${path}: body condition needs a valid JSONPath expression`,
      stepId,
      path,
    });
  if (conditionNeedsResponse(condition) && !context.hasPreviousRequest)
    add({
      level: "warning",
      message: `${path}: condition depends on a previous response before any request has run`,
      stepId,
      path,
    });
  validateMatcher(
    condition.matcher,
    expected,
    `${path}: condition`,
    add,
    stepId,
    path,
  );
}

function validateHeaders(
  headers: KeyValue[],
  label: string,
  add: (issue: FlowValidationIssue) => void,
  stepId: string,
  path: string,
) {
  const enabledNames = new Set<string>();
  headers.forEach((header, index) => {
    const key = header.key.trim();
    const prefix = `${label} ${index + 1}`;
    if (!key && header.value.trim())
      add({
        level: "error",
        message: `${prefix}: name is required when value is set`,
        stepId,
        path,
      });
    if (key && !HTTP_TOKEN_RE.test(key))
      add({
        level: "error",
        message: `${prefix}: invalid header name`,
        stepId,
        path,
      });
    if (/[\r\n]/.test(header.value))
      add({
        level: "error",
        message: `${prefix}: value must not contain line breaks`,
        stepId,
        path,
      });
    if (header.enabled === false || !key) return;
    const normalized = key.toLowerCase();
    if (enabledNames.has(normalized))
      add({
        level: "warning",
        message: `${prefix}: duplicate enabled header ${key}`,
        stepId,
        path,
      });
    enabledNames.add(normalized);
  });
}

function validateParams(
  params: KeyValue[],
  label: string,
  add: (issue: FlowValidationIssue) => void,
  stepId: string,
  path: string,
) {
  params.forEach((param, index) => {
    if (!param.key.trim() && param.value.trim())
      add({
        level: "error",
        message: `${label} ${index + 1}: key is required when value is set`,
        stepId,
        path,
      });
  });
}

function validateRequestBody(
  request: RequestConfig,
  add: (issue: FlowValidationIssue) => void,
  stepId: string,
  path: string,
) {
  if (request.bodyMode === "none" && request.body.trim())
    add({
      level: "warning",
      message: `${path}: body is ignored when body mode is none`,
      stepId,
      path,
    });
  if (
    request.bodyMode !== "json" ||
    !request.body.trim() ||
    hasTemplate(request.body)
  )
    return;
  try {
    JSON.parse(request.body);
  } catch {
    add({
      level: "error",
      message: `${path}: JSON body must be valid JSON`,
      stepId,
      path,
    });
  }
}

function validateAssertions(
  assertions: Assertion[],
  add: (issue: FlowValidationIssue) => void,
  stepId: string,
  path: string,
) {
  assertions.forEach((assertion, index) => {
    if (assertion.enabled === false) return;
    const prefix = `${path}, assertion ${index + 1}`;
    if (!assertion.id?.trim())
      add({
        level: "error",
        message: `${prefix}: id is required`,
        stepId,
        path,
      });
    if (!ASSERTION_TYPES.has(assertion.type))
      add({
        level: "error",
        message: `${prefix}: invalid assertion type`,
        stepId,
        path,
      });
    if (!MATCHERS.has(assertion.matcher))
      add({
        level: "error",
        message: `${prefix}: invalid matcher`,
        stepId,
        path,
      });
    if (
      ["header", "bodyJsonPath", "regex"].includes(assertion.type) &&
      !assertion.expression.trim() &&
      !assertion.expected.trim()
    )
      add({
        level: "error",
        message: `${prefix}: expression is required`,
        stepId,
        path,
      });
    if (
      assertion.type === "header" &&
      assertion.expression.trim() &&
      !HTTP_TOKEN_RE.test(assertion.expression.trim())
    )
      add({
        level: "error",
        message: `${prefix}: invalid header name`,
        stepId,
        path,
      });
    if (
      assertion.type === "bodyJsonPath" &&
      assertion.expression.trim() &&
      !isJsonPath(assertion.expression)
    )
      add({
        level: "error",
        message: `${prefix}: invalid JSONPath expression`,
        stepId,
        path,
      });
    if (assertion.type === "bodySchema")
      validateJsonSchema(
        assertion.expression.trim() || assertion.expected.trim(),
        `${prefix}: JSON Schema`,
        add,
        stepId,
        path,
      );
    if (assertion.type === "regex")
      validateRegex(
        assertion.expression.trim() || assertion.expected.trim(),
        `${prefix}: regex`,
        add,
        stepId,
        path,
      );
    validateMatcher(
      assertion.matcher,
      assertion.expected.trim(),
      prefix,
      add,
      stepId,
      path,
    );
  });
}

function validateExtractionRules(
  rules: ExtractionRule[],
  add: (issue: FlowValidationIssue) => void,
  stepId: string,
  path: string,
) {
  rules.forEach((rule, index) => {
    if (rule.enabled === false) return;
    const prefix = `${path}, extraction ${index + 1}`;
    if (
      !rule.variableName.trim() ||
      !VARIABLE_NAME_RE.test(rule.variableName.trim())
    )
      add({
        level: "error",
        message: `${prefix}: variable name is required and must be valid`,
        stepId,
        path,
      });
    if (!EXTRACTION_SOURCES.has(rule.source))
      add({
        level: "error",
        message: `${prefix}: invalid extraction source`,
        stepId,
        path,
      });
    if (rule.source !== "status" && !rule.expression.trim())
      add({
        level: "error",
        message: `${prefix}: expression is required`,
        stepId,
        path,
      });
    if (
      rule.source === "header" &&
      rule.expression.trim() &&
      !HTTP_TOKEN_RE.test(rule.expression.trim())
    )
      add({
        level: "error",
        message: `${prefix}: invalid header name`,
        stepId,
        path,
      });
    if (
      rule.source === "body" &&
      rule.expression.trim() &&
      !isJsonPath(rule.expression)
    )
      add({
        level: "error",
        message: `${prefix}: invalid JSONPath expression`,
        stepId,
        path,
      });
  });
}

function validateMatcher(
  matcher: string,
  expected: string,
  label: string,
  add: (issue: FlowValidationIssue) => void,
  stepId: string,
  path: string,
) {
  if (matcher !== "exists" && !expected)
    add({
      level: "error",
      message: `${label}: expected value is required for ${matcher}`,
      stepId,
      path,
    });
  if (
    (matcher === "gt" || matcher === "lt") &&
    expected &&
    !Number.isFinite(Number(expected))
  )
    add({
      level: "error",
      message: `${label}: expected value must be numeric for ${matcher}`,
      stepId,
      path,
    });
  if (matcher === "matches")
    validateRegex(expected, `${label}: expected value`, add, stepId, path);
}

function validateIntegerRange(
  value: number,
  min: number,
  max: number,
  label: string,
  add: (issue: FlowValidationIssue) => void,
  stepId: string,
  path: string,
) {
  if (!Number.isInteger(value))
    add({
      level: "error",
      message: `${label} must be an integer`,
      stepId,
      path,
    });
  else if (value < min || value > max)
    add({
      level: "error",
      message: `${label} must be between ${min} and ${max}`,
      stepId,
      path,
    });
}

function validateRegex(
  pattern: string,
  label: string,
  add: (issue: FlowValidationIssue) => void,
  stepId: string,
  path: string,
) {
  if (!pattern.trim()) return;
  try {
    const match = pattern.match(/^\/(.*)\/([dgimsuvy]*)$/);
    if (match) new RegExp(match[1], match[2]);
    else new RegExp(pattern);
  } catch {
    add({
      level: "error",
      message: `${label} must be a valid regular expression`,
      stepId,
      path,
    });
  }
}

function validateJsonSchema(
  value: string,
  label: string,
  add: (issue: FlowValidationIssue) => void,
  stepId: string,
  path: string,
) {
  if (!value.trim()) {
    add({ level: "error", message: `${label} is required`, stepId, path });
    return;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      add({
        level: "error",
        message: `${label} must be a JSON object`,
        stepId,
        path,
      });
  } catch {
    add({
      level: "error",
      message: `${label} must be valid JSON`,
      stepId,
      path,
    });
  }
}

function conditionNeedsResponse(condition: FlowCondition) {
  return (
    condition.source === "status" ||
    condition.source === "header" ||
    condition.source === "bodyJsonPath"
  );
}

function hasTemplate(value: string) {
  return /\{\{\s*[^}]+?\s*\}\}/.test(value);
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isJsonPath(expression: string) {
  const trimmed = expression.trim();
  if (!trimmed || !trimmed.startsWith("$")) return false;
  let bracketDepth = 0;
  for (const char of trimmed) {
    if (char === "[") bracketDepth += 1;
    if (char === "]") bracketDepth -= 1;
    if (bracketDepth < 0) return false;
  }
  if (bracketDepth !== 0) return false;
  try {
    JSONPath({ path: trimmed, json: {}, wrap: false });
    return true;
  } catch {
    return false;
  }
}
