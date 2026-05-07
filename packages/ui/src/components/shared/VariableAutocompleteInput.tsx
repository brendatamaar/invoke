import { useMemo, useRef, useState } from "react";
import { useStore } from "../../store";

const DYNAMIC_VARS = [
  "$uuid",
  "$randomUUID",
  "$timestamp",
  "$timestampMs",
  "$isoTimestamp",
  "$randomInt",
  "$randomFloat",
  "$randomBoolean",
  "$randomString",
  "$randomEmail",
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  spellCheck?: boolean;
}

export function VariableAutocompleteInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  spellCheck = false,
}: Props) {
  const { environments, activeEnvironmentId, sessionVariables } = useStore();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [triggerStart, setTriggerStart] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const allVars = useMemo(() => {
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const envKeys = (env?.variables ?? []).map((v) => v.key).filter(Boolean);
    const sessionKeys = Object.keys(sessionVariables);
    return [...new Set([...envKeys, ...sessionKeys, ...DYNAMIC_VARS])];
  }, [environments, activeEnvironmentId, sessionVariables]);

  const detectTrigger = (val: string, cursor: number) => {
    const before = val.slice(0, cursor);
    const lastOpen = before.lastIndexOf("{{");
    if (lastOpen === -1) return { active: false, start: -1, partial: "" };
    const afterOpen = before.slice(lastOpen + 2);
    if (afterOpen.includes("}}")) return { active: false, start: -1, partial: "" };
    return { active: true, start: lastOpen, partial: afterOpen };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursor = e.target.selectionStart ?? val.length;
    const { active, start, partial } = detectTrigger(val, cursor);
    if (active) {
      const filtered = allVars.filter((v) =>
        v.toLowerCase().startsWith(partial.toLowerCase()),
      );
      setSuggestions(filtered);
      setTriggerStart(start);
      setSelectedIdx(0);
    } else {
      setSuggestions([]);
      setTriggerStart(-1);
    }
  };

  const applySuggestion = (varName: string) => {
    const input = inputRef.current;
    if (!input || triggerStart === -1) return;
    const before = value.slice(0, triggerStart);
    const after = value.slice(input.selectionStart ?? value.length);
    const newVal = `${before}{{${varName}}}${after}`;
    onChange(newVal);
    setSuggestions([]);
    setTriggerStart(-1);
    requestAnimationFrame(() => {
      const pos = before.length + varName.length + 4;
      input.setSelectionRange(pos, pos);
      input.focus();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applySuggestion(suggestions[selectedIdx] ?? "");
        return;
      }
      if (e.key === "Escape") {
        setSuggestions([]);
        setTriggerStart(-1);
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder={placeholder}
        className={className}
        spellCheck={spellCheck}
      />
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto min-w-40">
          {suggestions.map((v, i) => (
            <button
              key={v}
              className={`w-full text-left px-3 py-1 text-xs font-mono ${i === selectedIdx ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--text-1)] hover:bg-[var(--surface-2)]"}`}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(v);
              }}
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
