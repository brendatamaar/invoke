import { X } from "lucide-react";
import { useStore } from "../../store";

export function SettingsPanel() {
  const { showSettings, uiFontSize, set } = useStore();
  if (!showSettings) return null;

  const setFontSize = (size: number) => {
    localStorage.setItem("uiFontSize", String(size));
    set({ uiFontSize: size });
    document.documentElement.style.setProperty("--ui-font-size", `${size}px`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => set({ showSettings: false })}>
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl flex flex-col"
        style={{ width: 380 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-semibold">Settings</span>
          <button onClick={() => set({ showSettings: false })} className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]">
            <X size={15} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div>
            <p className="text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">Appearance</p>

            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs text-[var(--text-2)] w-28 shrink-0">UI Font Size</span>
              <input
                type="range"
                min={11}
                max={16}
                step={1}
                value={uiFontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs font-mono text-[var(--text-3)] w-8 text-right">{uiFontSize}px</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-2)] w-28 shrink-0">Theme</span>
              <div className="flex gap-2">
                {["dark", "light"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      document.documentElement.setAttribute("data-theme", t);
                      localStorage.setItem("theme", t);
                    }}
                    className="btn text-xs capitalize py-0.5 px-3"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
