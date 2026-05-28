import type { PaletteItem } from "../../../types";
import { CommandItem } from "./CommandItem";

export function CommandList({
  items,
  selectedIndex,
  onHover,
  onSelect,
}: {
  items: PaletteItem[];
  selectedIndex: number;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="max-h-80 overflow-y-auto py-1">
      {items.length === 0 && (
        <p className="px-4 py-6 text-sm text-[var(--text-3)] text-center">No results</p>
      )}
      {items.map((item, index) => (
        <CommandItem
          key={item.id}
          item={item}
          selected={index === selectedIndex}
          onHover={() => onHover(index)}
          onSelect={() => onSelect(index)}
        />
      ))}
    </div>
  );
}
