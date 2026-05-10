import {
  Layers,
  History,
  Globe,
  GitBranch,
  Server,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useStore } from "../../store";
import { CollectionTree } from "../../features/collections/components/CollectionTree";
import { HistoryPanel } from "../../features/history/components/HistoryPanel";
import { EnvironmentPanel } from "../../features/environments/components/EnvironmentPanel";
import { FlowPanel } from "../../features/flows/components/FlowPanel";
import { MockPanel } from "../../features/mock/components/MockPanel";
import type { SidebarSection } from "../../types";

const NAV: { id: SidebarSection; icon: React.ReactNode; label: string }[] = [
  { id: "collections", icon: <Layers size={16} />, label: "Collections" },
  { id: "history", icon: <History size={16} />, label: "History" },
  { id: "environments", icon: <Globe size={16} />, label: "Environments" },
  { id: "flows", icon: <GitBranch size={16} />, label: "Flows" },
  { id: "mocks", icon: <Server size={16} />, label: "Mock" },
];

export function Sidebar() {
  const { sidebarSection, sidebarCollapsed, set } = useStore();

  return (
    <aside
      className="flex flex-col border-r border-[var(--border)] bg-[var(--surface-2)] overflow-hidden"
      style={{ width: sidebarCollapsed ? 44 : 280, flexShrink: 0 }}
    >
      {/* Icon nav */}
      <nav className="flex flex-col gap-0.5 p-1.5 border-b border-[var(--border)]">
        {NAV.map(({ id, icon, label }) => (
          <button
            key={id}
            title={sidebarCollapsed ? label : undefined}
            onClick={() => set({ sidebarSection: id, sidebarCollapsed: false })}
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded transition-colors ${sidebarCollapsed ? "justify-center" : ""} ${
              sidebarSection === id
                ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                : "text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--border)]"
            }`}
          >
            <span className="shrink-0">{icon}</span>
            {!sidebarCollapsed && (
              <span className="text-xs font-medium">{label}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => set({ sidebarCollapsed: !sidebarCollapsed })}
        className={`flex items-center py-1.5 border-b border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--border)] transition-colors ${sidebarCollapsed ? "justify-center" : "justify-end px-2.5"}`}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={13} />
        ) : (
          <ChevronLeft size={13} />
        )}
      </button>

      {/* Panel content */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-hidden">
          {sidebarSection === "collections" && <CollectionTree />}
          {sidebarSection === "history" && <HistoryPanel />}
          {sidebarSection === "environments" && <EnvironmentPanel />}
          {sidebarSection === "flows" && <FlowPanel />}
          {sidebarSection === "mocks" && <MockPanel />}
        </div>
      )}
    </aside>
  );
}
