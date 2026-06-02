import type { BodyMode, KeyValue, RequestDraft } from "@invoke/core";

export const BODY_MODES: BodyMode[] = ["none", "json", "form-data", "urlencoded", "raw", "file"];

export function buildBodyModePatch(
  request: RequestDraft,
  currentMode: BodyMode,
  nextMode: BodyMode,
): Partial<RequestDraft> {
  if (currentMode === "file" || nextMode === "file") {
    return { bodyMode: nextMode, body: "", bodyFileName: "" };
  }
  const isTargetKV = nextMode === "form-data" || nextMode === "urlencoded";
  const isSourceKV = currentMode === "form-data" || currentMode === "urlencoded";
  const isTargetJSON = nextMode === "json" || nextMode === "raw";
  const isSourceJSON = currentMode === "json" || currentMode === "raw";
  // Also check body shape for transitions through "none" where currentMode has no format info
  if (isTargetKV && (isSourceJSON || looksLikeJsonObject(request.body))) {
    return jsonToRowsPatch(request, nextMode);
  }
  if (isTargetJSON && (isSourceKV || looksLikeKeyValueArray(request.body))) {
    return rowsToJsonPatch(request, nextMode);
  }
  if (nextMode === "urlencoded" && currentMode === "form-data") {
    return formDataToUrlEncodedPatch(request, nextMode);
  }
  return { bodyMode: nextMode };
}

function looksLikeJsonObject(body?: string): boolean {
  if (!body) return false;
  try {
    const parsed = JSON.parse(body);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function looksLikeKeyValueArray(body?: string): boolean {
  if (!body) return false;
  try {
    const parsed = JSON.parse(body);
    return (
      Array.isArray(parsed) &&
      (parsed.length === 0 || (typeof parsed[0] === "object" && "key" in parsed[0]))
    );
  } catch {
    return false;
  }
}

function jsonToRowsPatch(request: RequestDraft, bodyMode: BodyMode) {
  try {
    const parsed = JSON.parse(request.body || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const rows: KeyValue[] = Object.entries(parsed).map(([key, value]) => ({
        key,
        value: typeof value === "string" ? value : JSON.stringify(value),
        enabled: true,
        type: "text",
      }));
      return { bodyMode, body: JSON.stringify(rows) };
    }
  } catch {
    /* fall through */
  }
  return { bodyMode };
}

function rowsToJsonPatch(request: RequestDraft, bodyMode: BodyMode) {
  try {
    const rows = JSON.parse(request.body || "[]") as KeyValue[];
    if (Array.isArray(rows)) {
      const obj = Object.fromEntries(
        rows.flatMap((row) =>
          row.enabled !== false && row.type !== "file" ? [[row.key, row.value]] : [],
        ),
      );
      return { bodyMode, body: JSON.stringify(obj, null, 2) };
    }
  } catch {
    /* fall through */
  }
  return { bodyMode };
}

function formDataToUrlEncodedPatch(request: RequestDraft, bodyMode: BodyMode) {
  try {
    const rows = JSON.parse(request.body || "[]") as KeyValue[];
    if (Array.isArray(rows)) {
      const textOnly = rows.map((row) =>
        row.type === "file"
          ? { ...row, type: "text" as const, value: "", fileName: undefined }
          : row,
      );
      return { bodyMode, body: JSON.stringify(textOnly) };
    }
  } catch {
    /* fall through */
  }
  return { bodyMode };
}

export function parseKeyValueBody(body?: string) {
  try {
    const parsed = JSON.parse(body || "[]");
    return Array.isArray(parsed) ? (parsed as KeyValue[]) : [];
  } catch {
    return [];
  }
}
