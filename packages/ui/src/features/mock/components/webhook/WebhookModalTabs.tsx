import type { WebhookModalTab } from "./types";

export function WebhookModalTabs({
  activeTab,
  historyCount,
  onSelect,
}: {
  activeTab: WebhookModalTab;
  historyCount: number;
  onSelect: (tab: WebhookModalTab) => void;
}) {
  return (
    <div
      className="flex shrink-0 px-4"
      style={{ background: "var(--bg-1)", borderBottom: "1px solid var(--line-1)" }}
    >
      {(["config", "history"] as const).map((tab) => (
        <button
          type="button"
          key={tab}
          onClick={() => onSelect(tab)}
          className="flex items-center gap-1.5 px-1 py-2.5 mr-4"
          style={{
            fontSize: "var(--t-xs)",
            fontWeight: 500,
            color: activeTab === tab ? "var(--fg-0)" : "var(--fg-3)",
            borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
            marginBottom: -1,
            textTransform: "capitalize",
            transition: "color var(--dur-fast)",
          }}
        >
          {tab}
          {tab === "history" && historyCount > 0 && (
            <span
              className="font-mono"
              style={{
                fontSize: 12,
                background: "var(--bg-3)",
                color: "var(--fg-2)",
                borderRadius: "var(--r-2)",
                padding: "0 4px",
                lineHeight: "16px",
              }}
            >
              {historyCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
