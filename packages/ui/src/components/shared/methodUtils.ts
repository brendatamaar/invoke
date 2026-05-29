export const METHOD_COLOR: Record<string, string> = {
  GET: "var(--method-get)",
  POST: "var(--method-post)",
  PUT: "var(--method-put)",
  PATCH: "var(--method-patch)",
  DELETE: "var(--method-delete)",
  HEAD: "var(--method-head)",
  OPTIONS: "var(--method-options)",
  GQL: "#e535ab",
  gRPC: "#00bcd4",
  WS: "#8b5cf6",
};

export function protocolMethod(protocol: string | undefined, method?: string): string {
  if (protocol === "graphql") return "GQL";
  if (protocol === "grpc") return "gRPC";
  if (protocol === "websocket") return "WS";
  return method ?? "GET";
}
