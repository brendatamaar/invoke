import type { BodyMode } from "@invoke/core";
import { BODY_MODES } from "./bodyMode";

export function BodyModeTabs({
  mode,
  onSelect,
}: {
  mode: BodyMode;
  onSelect: (mode: BodyMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
      {BODY_MODES.map((bodyMode) => (
        <button
          type="button"
          key={bodyMode}
          onClick={() => onSelect(bodyMode)}
          className={`tab-btn text-2xs ${mode === bodyMode ? "active" : ""}`}
        >
          {bodyMode}
        </button>
      ))}
    </div>
  );
}
