import { useMemo, useRef, useState } from "react";
import { isSensitiveVariableName, maskedValue } from "@invoke/core";
import { useStore } from "../../store";
import type {
  VariableAutocompleteInputProps,
  VariableSuggestion,
} from "../../types";

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

export function VariableAutocompleteInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  className,
  spellCheck = false,
  disabled,
  type = "text",
}: VariableAutocompleteInputProps) {
  const { environments, activeEnvironmentId, sessionVariables } = useStore();
  const [suggestions, setSuggestions] = useState<VariableSuggestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [triggerStart, setTriggerStart] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const allVars = useMemo(() => {
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const vars = new Map<string, VariableSuggestion>();
    (env?.variables ?? [])
      .filter((v) => v.enabled !== false && v.key.trim())
      .forEach((v) =>
        vars.set(v.key.trim(), {
          name: v.key.trim(),
          source: "environment",
          value: v.value,
          sensitive: v.sensitive || isSensitiveVariableName(v.key),
        }),
      );
    Object.entries(sessionVariables)
      .filter(([key]) => key.trim())
      .forEach(([key, value]) =>
        vars.set(key.trim(), {
          name: key.trim(),
          source: "session",
          value,
          sensitive: isSensitiveVariableName(key),
        }),
      );
    DYNAMIC_VARS.forEach((name) => vars.set(name, { name, source: "dynamic" }));
    return [...vars.values()];
  }, [environments, activeEnvironmentId, sessionVariables]);

  const variableTitle = useMemo(() => {
    const names = [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) =>
      String(match[1]).trim(),
    );
    if (!names.length) return undefined;
    const byName = new Map(
      allVars.map((variable) => [variable.name, variable]),
    );
    return [...new Set(names)]
      .map((name) => {
        const found = byName.get(name);
        if (!found) return `${name}: unresolved`;
        if (found.source === "dynamic") return `${name}: dynamic`;
        const preview = found.sensitive
          ? maskedValue(found.value ?? "")
          : (found.value ?? "");
        return `${name}: ${preview || "(empty)"} (${found.source})`;
      })
      .join("\n");
  }, [allVars, value]);

  const detectTrigger = (val: string, cursor: number) => {
    const before = val.slice(0, cursor);
    const lastOpen = before.lastIndexOf("{{");
    if (lastOpen === -1) return { active: false, start: -1, partial: "" };
    const afterOpen = before.slice(lastOpen + 2);
    if (afterOpen.includes("}}"))
      return { active: false, start: -1, partial: "" };
    return { active: true, start: lastOpen, partial: afterOpen };
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursor = e.target.selectionStart ?? val.length;
    const { active, start, partial } = detectTrigger(val, cursor);
    if (active) {
      const filtered = allVars.filter((v) =>
        v.name.toLowerCase().startsWith(partial.toLowerCase()),
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
        setSelectedIdx(
          (i) => (i - 1 + suggestions.length) % suggestions.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applySuggestion(suggestions[selectedIdx]?.name ?? "");
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
        type={type}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder={placeholder}
        className={className}
        spellCheck={spellCheck}
        disabled={disabled}
        title={variableTitle}
      />
      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto min-w-40">
          {suggestions.map((v, i) => (
            <button
              key={v.name}
              className={`w-full text-left px-3 py-1.5 text-xs ${i === selectedIdx ? "bg-[var(--accent-subtle)] text-[var(--accent)]" : "text-[var(--text-1)] hover:bg-[var(--surface-2)]"}`}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(v.name);
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono truncate">{`{{${v.name}}}`}</span>
                <span className="ml-auto text-2xs text-[var(--text-3)] uppercase tracking-wide">
                  {v.source}
                </span>
              </div>
              {v.source !== "dynamic" && (
                <div className="text-2xs text-[var(--text-3)] truncate mt-0.5">
                  {v.sensitive
                    ? maskedValue(v.value ?? "")
                    : v.value || "(empty)"}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
