import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
  footer?: ReactNode;
}

export function Dialog({ open, onClose, title, children, width = "480px", footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white border border-[var(--border)] rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
        style={{ width }}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
          <span className="font-semibold text-[var(--text-1)] text-sm">{title}</span>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded hover:bg-[var(--surface-2)]">
            <X size={14} />
          </button>
        </div>
        {/* body */}
        <div className="flex-1 overflow-auto p-5">{children}</div>
        {/* footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
