import { Settings, HelpCircle, Cookie } from "lucide-react";
import { useStore } from "../../store";
import { useCookies } from "../../hooks/useDb";
import { Select } from "../shared/Select";

export function TopBar() {
  const { environments, activeEnvironmentId, set, showSettings } = useStore();
  const cookies = useCookies();

  return (
    <header
      className="flex items-center gap-3 px-3 shrink-0 border-b"
      style={{
        height: 36,
        background: "var(--bg-1)",
        borderColor: "var(--line-1)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-1">
        <img src="/assets/logo-mark.svg" width={14} height={14} alt="" />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--fg-0)",
            letterSpacing: 0,
          }}
        >
          invoke
        </span>
      </div>

      {/* Command palette trigger */}
      <button
        type="button"
        onClick={() => set({ commandPaletteOpen: true })}
        className="flex items-center gap-2 flex-1 max-w-xs px-2 py-1 rounded-[var(--r-2)] border border-[var(--line-2)] bg-[var(--bg-2)] text-[var(--fg-3)] text-[var(--t-sm)] font-mono cursor-pointer transition-colors hover:border-[var(--line-3)]"
      >
        <span className="flex text-[var(--fg-3)]">
          <svg
            width={11}
            height={11}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16" y2="16" />
          </svg>
        </span>
        <span className="flex-1 text-left">search or jump to…</span>
        <kbd className="font-mono text-xs px-1 py-0.5 bg-[var(--bg-3)] border border-[var(--line-2)] rounded-[var(--r-1)] text-[var(--fg-2)]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* Environment switcher */}
        <Select
          value={activeEnvironmentId ?? ""}
          onChange={(e) => set({ activeEnvironmentId: e.target.value || undefined })}
          size="2xs"
          className="bg-[var(--bg-2)]"
        >
          <option value="">No environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </Select>

        <button
          type="button"
          onClick={() => set({ showCookieManager: true })}
          className="relative flex items-center px-1.5 py-1 rounded-[var(--r-2)] bg-transparent border-0 text-[var(--fg-2)] cursor-pointer hover:text-[var(--fg-0)]"
          title="Cookie manager"
        >
          <Cookie size={14} />
          {cookies.length > 0 && (
            <span
              className="absolute top-0.5 right-0.5"
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: "var(--accent)",
              }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => set({ showSettings: !showSettings, settingsTab: undefined })}
          title="Settings · ⌘,"
          className={`flex items-center px-1.5 py-1 rounded-[var(--r-2)] bg-transparent border-0 cursor-pointer hover:text-[var(--fg-0)] ${showSettings ? "text-[var(--accent)]" : "text-[var(--fg-2)]"}`}
        >
          <Settings size={14} />
        </button>

        <button
          type="button"
          onClick={() => set({ showHelp: true })}
          title="Help"
          className="flex items-center px-1.5 py-1 rounded-[var(--r-2)] bg-transparent border-0 text-[var(--fg-2)] cursor-pointer hover:text-[var(--fg-0)]"
        >
          <HelpCircle size={14} />
        </button>
      </div>
    </header>
  );
}
