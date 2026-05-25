import type { ReactNode } from "react";
import { List, Network, X } from "lucide-react";

export function FlowModalHeader({
  name,
  viewMode,
  onNameChange,
  onViewModeChange,
  onClose,
}: {
  name: string;
  viewMode: "list" | "canvas";
  onNameChange: (name: string) => void;
  onViewModeChange: (mode: "list" | "canvas") => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] shrink-0">
      <input
        className="input text-sm py-1 flex-1 font-medium"
        placeholder="Flow name"
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
      />
      <div className="flex rounded border border-[var(--border)] overflow-hidden">
        <ViewButton
          active={viewMode === "list"}
          icon={<List size={12} />}
          label="List"
          onClick={() => onViewModeChange("list")}
        />
        <ViewButton
          active={viewMode === "canvas"}
          icon={<Network size={12} />}
          label="Canvas"
          onClick={() => onViewModeChange("canvas")}
        />
      </div>
      <button
        onClick={onClose}
        className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded hover:bg-[var(--surface-2)]"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function ViewButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 text-2xs flex items-center gap-1 ${active ? "bg-[var(--accent)] text-white" : "text-[var(--text-3)] hover:bg-[var(--surface-2)]"}`}
      title={`${label} view`}
    >
      {icon} {label}
    </button>
  );
}
