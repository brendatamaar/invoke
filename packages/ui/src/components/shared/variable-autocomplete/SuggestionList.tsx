import type { VariableSuggestion } from "../../../types";
import { SuggestionItem } from "./SuggestionItem";

export function SuggestionList({
  suggestions,
  selectedIndex,
  onSelect,
}: {
  suggestions: VariableSuggestion[];
  selectedIndex: number;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--bg-2)] border border-[var(--line-2)] rounded-md shadow-[var(--shadow-2)] py-1 max-h-48 overflow-y-auto min-w-40">
      {suggestions.map((suggestion, index) => (
        <SuggestionItem
          key={suggestion.name}
          suggestion={suggestion}
          selected={index === selectedIndex}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
