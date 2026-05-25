import { X } from "lucide-react";
import type { MockRoute } from "@invoke/core";

export function RouteModalHeader({
  route,
  enabled,
  onEnabledChange,
  onClose,
}: {
  route: MockRoute;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] shrink-0">
      <span className="text-sm font-semibold text-[var(--text-1)] flex-1">
        {route.id && route.pathPattern !== "/" ? "Edit Route" : "New Route"}
      </span>
      <label className="flex items-center gap-2 text-xs text-[var(--text-2)] cursor-pointer mr-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        Enabled
      </label>
      <button
        onClick={onClose}
        className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded hover:bg-[var(--surface-2)]"
      >
        <X size={14} />
      </button>
    </div>
  );
}
