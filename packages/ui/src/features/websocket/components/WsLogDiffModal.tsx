import { X, ArrowLeftRight } from "lucide-react";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import type { WebSocketLogItem } from "../../../types";

function tryPrettyJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

interface Props {
  left: WebSocketLogItem | undefined;
  right: WebSocketLogItem | undefined;
  onClose: () => void;
}

export function WsLogDiffModal({ left, right, onClose }: Props) {
  const leftBody = left ? tryPrettyJson(left.body) : "";
  const rightBody = right ? tryPrettyJson(right.body) : "";

  const isJson = (s: string) => {
    try { JSON.parse(s); return true; } catch { return false; }
  };
  const lang = isJson(leftBody) || isJson(rightBody) ? "json" : "text";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: "90vw", maxHeight: "90vh", minHeight: "50vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
          <ArrowLeftRight size={15} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Compare Logs</span>
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Log labels */}
        <div className="flex border-b border-[var(--border)] shrink-0">
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-2)] border-r border-[var(--border)]">
            <span className="text-2xs font-medium text-[var(--text-2)]">Log A</span>
            {left && (
              <span className="text-2xs text-[var(--text-3)]">
                · {left.direction} · {new Date(left.createdAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-2)]">
            <span className="text-2xs font-medium text-[var(--text-2)]">Log B</span>
            {right && (
              <span className="text-2xs text-[var(--text-3)]">
                · {right.direction} · {new Date(right.createdAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Side-by-side editors */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden border-r border-[var(--border)]">
            <CodeEditor value={leftBody} lang={lang} readOnly />
          </div>
          <div className="flex-1 overflow-hidden">
            <CodeEditor value={rightBody} lang={lang} readOnly />
          </div>
        </div>
      </div>
    </div>
  );
}
