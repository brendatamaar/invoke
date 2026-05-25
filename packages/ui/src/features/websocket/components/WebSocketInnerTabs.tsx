import type { InnerTab } from "../types";
import { INNER_TABS } from "../types";

export function WebSocketInnerTabs({
  innerTab,
  onChange,
}: {
  innerTab: InnerTab;
  onChange: (tab: InnerTab) => void;
}) {
  return (
    <div className="flex items-center border-b border-[var(--border)] shrink-0 px-2">
      {INNER_TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 text-2xs border-b-2 transition-colors ${
            innerTab === tab.id
              ? "border-[var(--accent)] text-[var(--text-1)]"
              : "border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
