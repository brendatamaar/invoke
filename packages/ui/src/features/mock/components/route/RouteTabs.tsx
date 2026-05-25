import type { RouteTab } from "../../../../types";

export function RouteTabs({
  tab,
  sequenceCount,
  onTabChange,
}: {
  tab: RouteTab;
  sequenceCount: number;
  onTabChange: (tab: RouteTab) => void;
}) {
  return (
    <div className="flex gap-0 px-5 border-b border-[var(--border)] shrink-0">
      {(["response", "sequences", "headers"] as RouteTab[]).map((item) => (
        <button
          key={item}
          onClick={() => onTabChange(item)}
          className={`px-3 py-2 text-xs capitalize border-b-2 -mb-px transition-colors ${tab === item ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]"}`}
        >
          {item}
          {item === "sequences" && sequenceCount > 0 && (
            <span className="ml-1 text-2xs bg-[var(--accent-subtle)] text-[var(--accent)] rounded px-1">
              {sequenceCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
