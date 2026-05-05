import { Layers, History, Globe, GitBranch, Server, ChevronLeft, ChevronRight } from "lucide-react";
import { useStore } from "../../store";
import { CollectionTree } from "../sidebar/CollectionTree";
import { HistoryPanel } from "../panels/HistoryPanel";
import { EnvironmentPanel } from "../panels/EnvironmentPanel";
import { FlowPanel } from "../panels/FlowPanel";
import { MockPanel } from "../panels/MockPanel";
import type { SidebarSection } from "../../lib/types";

const NAV: { id: SidebarSection; icon: React.ReactNode; label: string }[] = [
  { id: "collections",  icon: <Layers size={16} />,    label: "Collections" },
  { id: "history",      icon: <History size={16} />,   label: "History" },
  { id: "environments", icon: <Globe size={16} />,     label: "Environments" },
  { id: "flows",        icon: <GitBranch size={16} />, label: "Flows" },
  { id: "mocks",        icon: <Server size={16} />,    label: "Mock" }
];

export function Sidebar() {
  const { sidebarSection, sidebarCollapsed, set } = useStore();

  return (
    <aside className="flex flex-col border-r border-[var(--border)] bg-[var(--surface-2)] overflow-hidden" style={{ width: sidebarCollapsed ? 40 : 260, flexShrink: 0 }}>
      {/* Icon nav */}
      <nav className="flex flex-col items-center gap-0.5 py-2 border-b border-[var(--border)]">
        {NAV.map(({ id, icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() => set({ sidebarSection: id, sidebarCollapsed: false })}
            className={`w-8 h-8 flex items-center justify-center rounded mx-auto transition-colors ${
              !sidebarCollapsed && sidebarSection === id
                ? "bg-[var(--accent-subtle)] text-[var(--accent)]"
                : "text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--border)]"
            }`}
          >
            {icon}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => set({ sidebarCollapsed: !sidebarCollapsed })}
        className="flex items-center justify-center py-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] border-b border-[var(--border)]"
      >
        {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      {/* Panel content */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-hidden">
          {sidebarSection === "collections"  && <CollectionTree />}
          {sidebarSection === "history"      && <HistoryPanel />}
          {sidebarSection === "environments" && <EnvironmentPanel />}
          {sidebarSection === "flows"        && <FlowPanel />}
          {sidebarSection === "mocks"        && <MockPanel />}
        </div>
      )}
    </aside>
  );
}
