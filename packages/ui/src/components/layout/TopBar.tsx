import { Settings, HelpCircle, Search } from "lucide-react";
import { useStore } from "../../store";
import { Select } from "../shared/Select";

export function TopBar() {
  const { environments, activeEnvironmentId, set, showSettings } = useStore();
  const activeEnv = environments.find((e) => e.id === activeEnvironmentId);

  return (
    <header className="flex items-center gap-3 px-4 h-10 border-b border-[var(--border)] bg-[var(--surface)] shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <span className="font-semibold text-sm text-[var(--text-1)] tracking-tight">invoke</span>
        <span className="text-2xs px-1 py-px bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--text-3)]">v1</span>
      </div>

      {/* Command palette trigger */}
      <button
        onClick={() => set({ commandPaletteOpen: true })}
        className="flex items-center gap-2 flex-1 max-w-xs px-3 py-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-3)] text-xs hover:border-[var(--border-strong)] transition-colors"
      >
        <Search size={12} />
        <span>Search or jump to…</span>
        <kbd className="ml-auto font-mono text-2xs px-1 py-px bg-[var(--surface-2)] border border-[var(--border)] rounded">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Environment switcher */}
        <Select
          value={activeEnvironmentId ?? ""}
          onChange={(e) => set({ activeEnvironmentId: e.target.value || undefined })}
          className="bg-[var(--surface-2)] px-2.5"
        >
          <option value="">No environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>{env.name}</option>
          ))}
        </Select>

        <button
          onClick={() => set({ showSettings: !showSettings })}
          className={`p-1.5 rounded hover:bg-[var(--surface-2)] ${showSettings ? "text-[var(--accent)]" : "text-[var(--text-3)]"}`}
          title="Settings"
        >
          <Settings size={15} />
        </button>
        <button
          onClick={() => set({ showHelp: true })}
          className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          title="Help"
        >
          <HelpCircle size={15} />
        </button>
      </div>
    </header>
  );
}
