import type {
  DiffChange,
  DiffResult,
  ExecuteResponse,
  KeyValue,
} from "./types";

export function compareResponses(
  left: ExecuteResponse,
  right: ExecuteResponse,
): DiffResult {
  const leftBody = parseMaybeJson(left.body);
  const rightBody = parseMaybeJson(right.body);
  const jsonMode = leftBody.ok && rightBody.ok;
  const changes = jsonMode
    ? compareValues(leftBody.value, rightBody.value, "body")
    : compareText(left.body, right.body);

  changes.push(
    ...compareValues(
      headersToObject(left.headers),
      headersToObject(right.headers),
      "headers",
    ),
  );
  if (left.status !== right.status)
    changes.push({
      type: "change",
      path: "status",
      oldValue: left.status,
      value: right.status,
    });
  if (left.statusText !== right.statusText) {
    changes.push({
      type: "change",
      path: "statusText",
      oldValue: left.statusText,
      value: right.statusText,
    });
  }

  const summary = summarize(changes);
  return {
    changes,
    summary,
    leftText: pretty(leftBody.ok ? leftBody.value : left.body),
    rightText: pretty(rightBody.ok ? rightBody.value : right.body),
    responseTimeDeltaMs:
      (right.timing?.totalMs ?? 0) - (left.timing?.totalMs ?? 0),
    mode: jsonMode ? "json" : "text",
  };
}

function compareValues(
  left: unknown,
  right: unknown,
  path: string,
): DiffChange[] {
  if (isEqual(left, right)) return [];

  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    return Array.from({ length }).flatMap((_, index) =>
      compareValueAt(left[index], right[index], `${path}[${index}]`),
    );
  }

  if (isObject(left) && isObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].flatMap((key) =>
      compareValueAt(left[key], right[key], path ? `${path}.${key}` : key),
    );
  }

  return [{ type: "change", path, oldValue: left, value: right }];
}

function compareValueAt(
  left: unknown,
  right: unknown,
  path: string,
): DiffChange[] {
  if (left === undefined && right !== undefined)
    return [{ type: "add", path, value: right }];
  if (left !== undefined && right === undefined)
    return [{ type: "remove", path, oldValue: left }];
  return compareValues(left, right, path);
}

function compareText(left: string, right: string): DiffChange[] {
  const leftLines = left.split(/\r?\n/);
  const rightLines = right.split(/\r?\n/);
  const length = Math.max(leftLines.length, rightLines.length);
  const changes: DiffChange[] = [];
  for (let index = 0; index < length; index += 1) {
    const oldValue = leftLines[index];
    const value = rightLines[index];
    if (oldValue === value) continue;
    if (oldValue === undefined)
      changes.push({ type: "add", path: `line ${index + 1}`, value });
    else if (value === undefined)
      changes.push({ type: "remove", path: `line ${index + 1}`, oldValue });
    else
      changes.push({
        type: "change",
        path: `line ${index + 1}`,
        oldValue,
        value,
      });
  }
  return changes;
}

function summarize(changes: DiffChange[]) {
  return {
    additions: changes.filter((change) => change.type === "add").length,
    deletions: changes.filter((change) => change.type === "remove").length,
    changes: changes.filter((change) => change.type === "change").length,
  };
}

function headersToObject(headers: KeyValue[]) {
  return Object.fromEntries(
    headers.map((header) => [header.key.toLowerCase(), header.value]),
  );
}

function parseMaybeJson(
  value: string,
): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) as unknown };
  } catch {
    return { ok: false };
  }
}

function pretty(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}
