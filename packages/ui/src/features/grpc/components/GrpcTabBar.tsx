import type { GrpcTab } from "../types";
import { GRPC_TABS } from "../types";

export function GrpcTabBar({
  activeTab,
  includeMessage,
  onSelect,
}: {
  activeTab: GrpcTab;
  includeMessage: boolean;
  onSelect: (tab: GrpcTab) => void;
}) {
  const tabs = includeMessage ? GRPC_TABS : GRPC_TABS.filter((tab) => tab.id !== "message");

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--border)]">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`tab-btn text-2xs ${activeTab === t.id ? "active" : ""}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
