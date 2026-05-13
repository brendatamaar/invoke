import { Settings, HelpCircle, Cookie } from "lucide-react";
import { useStore } from "../../store";
import { Select } from "../shared/Select";

export function TopBar() {
  const { environments, activeEnvironmentId, cookies, set, showSettings } =
    useStore();

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
        onClick={() => set({ commandPaletteOpen: true })}
        className="flex items-center gap-2 flex-1 max-w-xs"
        style={{
          padding: "4px 8px",
          borderRadius: "var(--r-2)",
          border: "1px solid var(--line-2)",
          background: "var(--bg-2)",
          color: "var(--fg-3)",
          fontSize: "var(--t-sm)",
          fontFamily: "var(--font-mono)",
          cursor: "pointer",
          transition: "border-color var(--dur-fast)",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor = "var(--line-3)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)")
        }
      >
        <span style={{ color: "var(--fg-3)", display: "flex" }}>
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
        <span style={{ flex: 1, textAlign: "left" }}>search or jump to…</span>
        <kbd
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            padding: "1px 4px",
            background: "var(--bg-3)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--r-1)",
            color: "var(--fg-2)",
          }}
        >
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        {/* Environment switcher */}
        <Select
          value={activeEnvironmentId ?? ""}
          onChange={(e) =>
            set({ activeEnvironmentId: e.target.value || undefined })
          }
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
          onClick={() => set({ showCookieManager: true })}
          className="relative"
          title="Cookie manager"
          style={{
            padding: "4px 6px",
            borderRadius: "var(--r-2)",
            background: "transparent",
            border: "none",
            color: "var(--fg-2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--fg-0)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--fg-2)")
          }
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
          onClick={() =>
            set({ showSettings: !showSettings, settingsTab: undefined })
          }
          title="Settings · ⌘,"
          style={{
            padding: "4px 6px",
            borderRadius: "var(--r-2)",
            background: "transparent",
            border: "none",
            color: showSettings ? "var(--accent)" : "var(--fg-2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => {
            if (!showSettings)
              (e.currentTarget as HTMLElement).style.color = "var(--fg-0)";
          }}
          onMouseLeave={(e) => {
            if (!showSettings)
              (e.currentTarget as HTMLElement).style.color = "var(--fg-2)";
          }}
        >
          <Settings size={14} />
        </button>

        <button
          onClick={() => set({ showHelp: true })}
          title="Help"
          style={{
            padding: "4px 6px",
            borderRadius: "var(--r-2)",
            background: "transparent",
            border: "none",
            color: "var(--fg-2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--fg-0)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color = "var(--fg-2)")
          }
        >
          <HelpCircle size={14} />
        </button>
      </div>
    </header>
  );
}
