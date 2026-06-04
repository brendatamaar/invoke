import { Layers, History, Globe, GitBranch, Server } from "lucide-react";
import { useStore } from "../../store";
import { CollectionTree } from "../../features/collections";
import { HistoryPanel } from "../../features/history";
import { EnvironmentPanel } from "../../features/environments";
import { FlowPanel } from "../../features/flows";
import { MockPanel } from "../../features/mock";
import type { SidebarSection } from "../../types/navigation";

const NAV: { id: SidebarSection; icon: React.ReactNode; label: string }[] = [
  { id: "collections", icon: <Layers size={15} />, label: "Collections" },
  { id: "history", icon: <History size={15} />, label: "History" },
  { id: "environments", icon: <Globe size={15} />, label: "Environments" },
  { id: "flows", icon: <GitBranch size={15} />, label: "Flows" },
  { id: "mocks", icon: <Server size={15} />, label: "Mock" },
];

const RAIL_WIDTH = 36;
const PANEL_WIDTH = 270;

export function Sidebar() {
  const { sidebarCollapsed, sidebarSection, set } = useStore();

  return (
    <aside
      className="flex overflow-hidden shrink-0"
      style={{
        width: sidebarCollapsed ? RAIL_WIDTH : RAIL_WIDTH + PANEL_WIDTH,
        borderRight: "1px solid var(--line-2)",
        background: "var(--bg-1)",
      }}
    >
      {/* Icon rail */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: RAIL_WIDTH,
          borderRight: sidebarCollapsed ? "none" : "1px solid var(--line-1)",
          background: "var(--bg-1)",
          paddingTop: 4,
          paddingBottom: 4,
        }}
      >
        {NAV.map(({ id, icon, label }) => {
          const active = sidebarSection === id && !sidebarCollapsed;
          return (
            <button
              key={id}
              type="button"
              title={label}
              data-tour={
                id === "collections"
                  ? "sidebar-collections"
                  : id === "environments"
                    ? "sidebar-environments"
                    : undefined
              }
              onClick={() => {
                if (sidebarSection === id) {
                  set({ sidebarCollapsed: !sidebarCollapsed });
                } else {
                  set({ sidebarSection: id, sidebarCollapsed: false });
                }
              }}
              className={`flex items-center justify-center border-0 bg-transparent cursor-pointer transition-colors relative hover:text-[var(--fg-1)] ${active ? "text-[var(--accent)]" : "text-[var(--fg-3)]"}`}
              style={{ width: RAIL_WIDTH, height: 32 }}
            >
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "20%",
                    bottom: "20%",
                    width: 2,
                    background: "var(--accent)",
                    borderRadius: "0 1px 1px 0",
                  }}
                />
              )}
              {icon}
            </button>
          );
        })}
      </div>

      {/* Panel content */}
      {!sidebarCollapsed && sidebarSection && (
        <div
          className="flex flex-col flex-1 overflow-hidden"
          style={{ width: PANEL_WIDTH, background: "var(--bg-1)" }}
        >
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
