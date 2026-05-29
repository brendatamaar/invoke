import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store";
import { CommandFooter } from "./command-palette/CommandFooter";
import { CommandList } from "./command-palette/CommandList";
import { CommandSearchInput } from "./command-palette/CommandSearchInput";
import { usePaletteItems } from "./command-palette/usePaletteItems";
import { searchPaletteItems } from "./utils/commandSearch";

export function CommandPalette() {
  const { commandPaletteOpen, commandQuery, set } = useStore();
  const allItems = usePaletteItems();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = searchPaletteItems(allItems, commandQuery);

  useEffect(() => {
    if (commandPaletteOpen) {
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      return () => clearTimeout(id);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        set({ commandPaletteOpen: !commandPaletteOpen, commandQuery: "" });
      }
      if (!commandPaletteOpen) return;
      if (event.key === "Escape") set({ commandPaletteOpen: false });
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((index) => Math.min(index + 1, items.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((index) => Math.max(index - 1, 0));
      }
      if (event.key === "Enter") {
        items[selectedIndex]?.run();
        set({ commandPaletteOpen: false });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, items, selectedIndex, set]);

  if (!commandPaletteOpen) return null;

  const close = () => set({ commandPaletteOpen: false });
  const runItem = (index: number) => {
    items[index]?.run();
    close();
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="w-full max-w-lg bg-[var(--bg-2)] border border-[var(--line-2)] rounded-md shadow-[var(--shadow-pop)] overflow-hidden">
        <CommandSearchInput
          inputRef={inputRef}
          query={commandQuery}
          onChange={(query) => {
            set({ commandQuery: query });
            setSelectedIndex(0);
          }}
        />
        <CommandList
          items={items}
          selectedIndex={selectedIndex}
          onHover={setSelectedIndex}
          onSelect={runItem}
        />
        <CommandFooter />
      </div>
    </div>
  );
}
