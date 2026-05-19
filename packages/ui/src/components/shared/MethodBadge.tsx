import type { MethodBadgeProps } from "../../types";

const METHOD_COLOR: Record<string, string> = {
  GET: "var(--method-get)",
  POST: "var(--method-post)",
  PUT: "var(--method-put)",
  PATCH: "var(--method-patch)",
  DELETE: "var(--method-delete)",
  HEAD: "var(--method-head)",
  OPTIONS: "var(--method-options)",
};

export function MethodBadge({ method, size = "sm" }: MethodBadgeProps) {
  const color = METHOD_COLOR[method] ?? "var(--fg-2)";
  const display =
    method === "DELETE" ? "DEL" : method === "OPTIONS" ? "OPT" : method;
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: size === "md" ? 12 : 11,
        fontWeight: 600,
        color,
        letterSpacing: 0,
        display: "inline-block",
        width: size === "md" ? 50 : 35,
        flexShrink: 0,
      }}
    >
      {display}
    </span>
  );
}
