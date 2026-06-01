import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { DialogProps } from "../../types";

export function Dialog({ open, onClose, title, children, width = "480px", footer }: DialogProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50"
      role="presentation"
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
            type="button"
            onClick={onClose}
            className="flex p-0.5 bg-transparent border-0 cursor-pointer text-[var(--fg-3)] hover:text-[var(--fg-0)] rounded-[var(--r-1)] transition-colors"
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
