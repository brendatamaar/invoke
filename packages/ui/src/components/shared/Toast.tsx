import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { useStore } from "../../store";

const ICONS = {
  success: <CheckCircle size={14} className="text-[var(--success)]" />,
  error: <AlertCircle size={14} className="text-[var(--danger)]" />,
  info: <Info size={14} className="text-[var(--accent)]" />,
  warn: <AlertTriangle size={14} className="text-[var(--warn)]" />,
};

export function Toasts() {
  const { toasts, removeToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 bg-[var(--bg-2)] border border-[var(--line-2)] rounded-md shadow-[var(--shadow-2)] px-3.5 py-2.5 text-sm max-w-sm animate-in fade-in slide-in-from-bottom-2"
        >
          {ICONS[t.kind]}
          <span className="text-[var(--text-1)] flex-1">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-[var(--text-3)] hover:text-[var(--text-2)] ml-1"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
