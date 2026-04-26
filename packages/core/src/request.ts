import { v7 as uuidv7 } from "uuid";
import type { RequestConfig } from "./types";

export const id = () => uuidv7();

export const emptyRequest = (): RequestConfig => ({
  method: "GET",
  url: "",
  params: [],
  headers: [],
  bodyMode: "none",
  body: "",
  auth: { type: "none" },
  timeoutMs: 30000
});

export function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
