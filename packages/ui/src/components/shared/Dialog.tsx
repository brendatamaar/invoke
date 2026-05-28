import { X } from "lucide-react";
import { useEffect } from "react";
import type { DialogProps } from "../../types";

export function Dialog({ open, onClose, title, children, width = "480px", footer }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col max-h-[80vh] overflow-hidden"
        style={{
          width,
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          borderRadius: "var(--r-3)",
          boxShadow: "var(--shadow-pop)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--line-1)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "var(--t-base)",
              fontWeight: 600,
              color: "var(--fg-0)",
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--fg-3)",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              borderRadius: "var(--r-1)",
              transition: "color var(--dur-fast)",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-0)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--fg-3)")}
          >
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto" style={{ padding: "14px" }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-2"
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--line-1)",
              background: "var(--bg-1)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
