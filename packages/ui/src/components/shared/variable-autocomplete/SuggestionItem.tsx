import { maskedValue } from "@invoke/core";
import type { VariableSuggestion } from "../../../types";

export function SuggestionItem({
  suggestion,
  selected,
  onSelect,
}: {
  suggestion: VariableSuggestion;
  selected: boolean;
  onSelect: (name: string) => void;
}) {
  return (
    <button
      type="button"
      className={`w-full text-left px-3 py-1.5 text-xs ${selected ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--text-1)] hover:bg-[var(--surface-2)]"}`}
      onMouseDown={(event) => {
        event.preventDefault();
        onSelect(suggestion.name);
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono truncate">{`{{${suggestion.name}}}`}</span>
        <span className="ml-auto text-2xs text-[var(--text-3)] uppercase tracking-wide">
          {suggestion.source}
        </span>
      </div>
      {suggestion.source !== "dynamic" && (
        <div className="text-2xs text-[var(--text-3)] truncate mt-0.5">
          {suggestion.sensitive
            ? maskedValue(suggestion.value ?? "")
            : suggestion.value || "(empty)"}
        </div>
      )}
    </button>
  );
}
