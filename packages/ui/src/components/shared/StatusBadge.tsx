import type { StatusBadgeProps } from "../../types";

export function StatusBadge({ status }: StatusBadgeProps) {
  let color = "var(--fg-2)";
  let bg = "transparent";
  let border = "var(--line-2)";

  if (status === 0) {
    color = "var(--danger)";
    bg = "var(--danger-bg)";
    border = "var(--danger)";
  } else if (status >= 200 && status < 300) {
    color = "var(--ok)";
    bg = "var(--ok-bg)";
    border = "var(--ok)";
  } else if (status >= 300 && status < 400) {
    color = "var(--info)";
    bg = "var(--info-bg)";
    border = "var(--info)";
  } else if (status >= 400) {
    color = "var(--danger)";
    bg = "var(--danger-bg)";
    border = "var(--danger)";
  }

  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 7px",
        borderRadius: "var(--r-2)",
        color,
        background: bg,
        border: `1px solid ${border}`,
        display: "inline-block",
        lineHeight: "16px",
      }}
    >
      {status === 0 ? "ERR" : status}
    </span>
  );
}
