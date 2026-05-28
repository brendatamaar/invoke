import type { HttpMethod } from "@invoke/core";

export const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export const METHOD_COLORS: Record<string, string> = {
  GET: "text-[var(--method-get)]",
  POST: "text-[var(--method-post)]",
  PUT: "text-[var(--method-put)]",
  PATCH: "text-[var(--method-patch)]",
  DELETE: "text-[var(--method-delete)]",
  HEAD: "text-[var(--fg-2)]",
  OPTIONS: "text-[var(--fg-2)]",
};

export const SCOPE_LABEL: Record<string, string> = {
  environment: "env",
  collection: "collection",
  folder: "folder",
  session: "session",
};
