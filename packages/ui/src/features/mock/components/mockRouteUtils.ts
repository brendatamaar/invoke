import type { MockRoute, MockSequenceItem } from "@invoke/core";

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export function makeRoute(): MockRoute {
  return {
    id: crypto.randomUUID(),
    enabled: true,
    method: "GET",
    pathPattern: "/",
    status: 200,
    headers: [],
    body: "",
    latencyMs: 0,
  };
}

export function makeSequenceItem(): MockSequenceItem {
  return { status: 200, headers: [], body: "" };
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}
