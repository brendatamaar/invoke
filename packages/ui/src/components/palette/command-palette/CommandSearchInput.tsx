import type { RefObject } from "react";
import { Search } from "lucide-react";

export function CommandSearchInput({
  inputRef,
  query,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  onChange: (query: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
      <Search size={15} className="text-[var(--text-3)] shrink-0" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search requests, environments, commands..."
        className="flex-1 bg-transparent outline-none text-sm text-[var(--text-1)] placeholder-[var(--text-3)]"
      />
      <kbd className="text-2xs px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-3)]">
        esc
      </kbd>
    </div>
  );
}
