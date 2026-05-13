import { X, Keyboard } from "lucide-react";
import { useStore } from "../../../store";

const SHORTCUTS = [
  { key: "Ctrl+Enter", desc: "Send request" },
  { key: "Ctrl+K / ⌘K", desc: "Open command palette" },
  { key: "Ctrl+S", desc: "Save request to collection" },
];

const TIPS = [
  "Use {{variableName}} syntax to reference environment variables in URLs, headers, and body.",
  "The Extract tab captures response values into session variables automatically after each request.",
  "Use the Flows panel to chain multiple requests together with variable passing.",
  "Stream mode lets you view SSE/chunked responses in real time.",
];

export function HelpModal() {
  const { showHelp, set } = useStore();
  if (!showHelp) return null;

  const close = () => set({ showHelp: false });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={close}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <Keyboard size={15} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold">Help</span>
          <button
            onClick={close}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div>
            <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
              Keyboard Shortcuts
            </p>
            <div className="flex flex-col gap-1.5">
              {SHORTCUTS.map(({ key, desc }) => (
                <div key={key} className="flex items-center gap-3">
                  <kbd className="text-2xs px-2 py-1 bg-[var(--surface-2)] border border-[var(--border)] rounded font-mono min-w-[110px] text-center shrink-0">
                    {key}
                  </kbd>
                  <span className="text-xs text-[var(--text-1)]">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-2">
              Tips
            </p>
            <ul className="flex flex-col gap-1.5">
              {TIPS.map((tip) => (
                <li
                  key={tip}
                  className="text-xs text-[var(--text-2)] flex gap-2"
                >
                  <span className="text-[var(--accent)] shrink-0 mt-0.5">
                    •
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-[var(--border)]">
          <p className="text-2xs text-[var(--text-3)]">
            invoke — open-source API client
          </p>
        </div>
      </div>
    </div>
  );
}
