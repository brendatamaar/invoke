import { ChevronDown, Settings, HelpCircle, Search } from "lucide-react";
import { useStore } from "../../store";

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
        <kbd className="ml-auto font-mono text-2xs px-1 py-px bg-white border border-[var(--border)] rounded">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        {/* Environment switcher */}
        <div className="relative">
          <select
            value={activeEnvironmentId ?? ""}
            onChange={(e) => set({ activeEnvironmentId: e.target.value || undefined })}
            className="appearance-none bg-none bg-[var(--surface-2)] border border-[var(--border)] rounded px-2.5 py-1 pr-6 text-xs text-[var(--text-1)] cursor-pointer outline-none focus:border-[var(--accent)]"
          >
            <option value="">No environment</option>
            {environments.map((env) => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] pointer-events-none" />
        </div>

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
