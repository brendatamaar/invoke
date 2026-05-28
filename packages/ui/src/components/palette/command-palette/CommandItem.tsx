import { ArrowRight } from "lucide-react";
import type { PaletteItem } from "../../../types";
import { MethodBadge } from "../../shared/MethodBadge";

const KIND_LABELS: Record<string, string> = {
  request: "Request",
  environment: "Env",
  command: "Command",
  collection: "Collection",
  flow: "Flow",
  history: "History",
  mock: "Mock",
};

const KIND_COLORS: Record<string, string> = {
  request: "text-[var(--info)]",
  environment: "text-[var(--method-patch)]",
  command: "text-[var(--fg-2)]",
  collection: "text-[var(--warn)]",
  flow: "text-[var(--ok)]",
  history: "text-[var(--accent)]",
  mock: "text-[var(--danger)]",
};

export function CommandItem({
  item,
  selected,
  onHover,
  onSelect,
}: {
  item: PaletteItem;
  selected: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${selected ? "bg-[var(--accent-subtle)]" : "hover:bg-[var(--surface-2)]"}`}
      onMouseEnter={onHover}
      onClick={onSelect}
    >
      {item.method ? (
        <MethodBadge method={item.method} />
      ) : (
        <span className={`text-2xs font-medium ${KIND_COLORS[item.kind] ?? "text-[var(--fg-2)]"}`}>
          {KIND_LABELS[item.kind] ?? item.kind}
        </span>
      )}
      <span className="flex-1 text-sm text-[var(--text-1)] truncate">{item.title}</span>
      <span className="text-xs text-[var(--text-3)] truncate max-w-[160px]">{item.subtitle}</span>
      {selected && <ArrowRight size={12} className="text-[var(--accent)] shrink-0" />}
    </div>
  );
}
