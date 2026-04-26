import { v7 as uuidv7 } from "uuid";
import type { RequestConfig, RequestDraft } from "./types";

export const id = () => uuidv7();

export const emptyRequest = (): RequestDraft => ({
  method: "GET",
  url: "",
  params: [],
  headers: [],
  bodyMode: "none",
  body: "",
  auth: { type: "none" },
  timeoutMs: 30000,
  variables: [],
  protocol: "rest"
});

export function toRequestConfig(request: RequestConfig | RequestDraft): RequestConfig {
  const draft = request as RequestDraft;
  return {
    method: draft.method,
    url: draft.url,
    params: draft.params ?? [],
    headers: draft.headers ?? [],
    bodyMode: draft.bodyMode ?? "none",
    body: draft.body ?? "",
    auth: draft.auth ?? { type: "none" },
    timeoutMs: draft.timeoutMs ?? 30000,
    variables: draft.variables ?? [],
    options: draft.options
  };
}

export function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
