import { Layers, RefreshCw, Search, X } from "lucide-react";
import { fmtAge } from "../utils/cache";

export function GraphQLSchemaModalHeader({
  view,
  search,
  lastFetched,
  refreshing,
  onViewChange,
  onSearchChange,
  onRefresh,
  onClose,
}: {
  view: "types" | "sdl" | "frags";
  search: string;
  lastFetched: number;
  refreshing: boolean;
  onViewChange: (view: "types" | "sdl" | "frags") => void;
  onSearchChange: (search: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--surface-2)]">
      <Layers size={14} className="text-[var(--accent)] shrink-0" />
      <span className="text-sm font-semibold">Schema Explorer</span>

      <div className="flex items-center gap-0.5 ml-2">
        {(["types", "sdl", "frags"] as const).map((v) => (
          <button
            type="button"
            key={v}
            onClick={() => onViewChange(v)}
            className={`tab-btn text-xs py-0.5 px-2 ${view === v ? "active" : ""}`}
          >
            {v === "types" ? "Types" : v === "sdl" ? "SDL" : "Fragments"}
          </button>
        ))}
      </div>

      {view === "types" && (
        <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--border)] focus-within:border-[var(--accent)] rounded-md px-2 py-1 w-52 ml-2 transition-colors">
          <Search size={11} className="text-[var(--text-3)] shrink-0" />
          <input
            aria-label="Search types and fields"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search types and fields…"
            className="bg-transparent text-xs outline-none border-0 focus:ring-0 focus:border-0 flex-1 min-w-0 text-[var(--text-1)] placeholder-[var(--text-3)]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              <X size={11} />
            </button>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {lastFetched > 0 && (
          <span className="text-xs text-[var(--text-3)]">{fmtAge(lastFetched)}</span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="p-1 rounded hover:bg-[var(--border)] text-[var(--text-3)] disabled:opacity-50 transition-colors"
          title="Refresh schema"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--border)] text-[var(--text-3)] transition-colors"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
