import { Wand2, PlusCircle } from "lucide-react";
import { useStore } from "../../../store";
import type { AssertionDraft, ExtractionDraft } from "../../../types";

export function HeadersTab({
  onQuickAssert,
  onQuickExtract,
}: {
  onQuickAssert: (d: AssertionDraft) => void;
  onQuickExtract: (d: ExtractionDraft) => void;
}) {
  const { response } = useStore();
  if (!response) return null;
  const headers = Array.isArray(response.headers) ? response.headers : [];
  return (
    <div className="divide-y divide-[var(--border)]">
      {headers.map((h) => (
        <div key={h.key} className="group flex items-start gap-2 px-3 py-2 hover:bg-[var(--surface-2)]">
          <span className="text-xs font-mono font-medium text-[var(--text-1)] w-56 shrink-0 truncate">
            {h.key}
          </span>
          <span className="text-xs font-mono text-[var(--text-2)] break-all flex-1">{h.value}</span>
          <button
            type="button"
            onClick={() =>
              onQuickAssert({
                type: "header",
                expression: h.key,
                matcher: "equals",
                expected: h.value,
              })
            }
            className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--accent)] p-0.5 shrink-0"
            title="Create assertion from this header"
          >
            <PlusCircle size={11} />
          </button>
          <button
            type="button"
            onClick={() => {
              const varName = h.key.toLowerCase().replace(/[^a-z0-9]/g, "_");
              onQuickExtract({
                variableName: varName,
                source: "header",
                expression: h.key,
              });
            }}
            className="opacity-0 group-hover:opacity-100 text-[var(--text-3)] hover:text-[var(--accent)] p-0.5 shrink-0"
            title="Create extraction from this header"
          >
            <Wand2 size={11} />
          </button>
        </div>
      ))}
      {!headers.length && <p className="p-4 text-xs text-[var(--text-3)]">No headers</p>}
    </div>
  );
}
