import type { MsgTemplate } from "../types";
import { PROTOCOL_TEMPLATES } from "../utils/templates";

export function TemplateMenu({ onSelect }: { onSelect: (template: MsgTemplate) => void }) {
  return (
    <div
      className="absolute right-0 top-full mt-1 z-50 min-w-48 overflow-y-auto"
      style={{
        background: "var(--bg-2)",
        border: "1px solid var(--line-2)",
        borderRadius: "var(--r-2)",
        boxShadow: "var(--shadow-pop)",
        maxHeight: "min(280px, 50vh)",
      }}
    >
      {Object.entries(PROTOCOL_TEMPLATES).map(([group, templates]) => (
        <div key={group}>
          <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-wide border-b border-[var(--border)]">
            {group}
          </div>
          {templates.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => onSelect(tpl)}
              className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors"
            >
              {tpl.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
