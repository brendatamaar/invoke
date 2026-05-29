import type { MethodBadgeProps } from "../../types";
import { METHOD_COLOR } from "./methodUtils";

export function MethodBadge({ method, size = "sm" }: MethodBadgeProps) {
  const color = METHOD_COLOR[method] ?? "var(--fg-2)";
  const display = method === "DELETE" ? "DEL" : method === "OPTIONS" ? "OPT" : method;
  return (
    <span
      className={`font-mono font-semibold tracking-normal inline-block shrink-0 ${size === "md" ? "text-[12px] w-[50px]" : "text-[11px] w-[35px]"}`}
      style={{ color }}
    >
      {display}
    </span>
  );
}
