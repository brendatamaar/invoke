import { useMemo, useRef, useState, useCallback } from "react";
import { isSensitiveVariableName, maskedValue } from "@invoke/core";
import { useStore } from "../../store";
import type { VariableAutocompleteInputProps, VariableSuggestion } from "../../types";
import { SuggestionList } from "./variable-autocomplete/SuggestionList";

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
  id,
  value,
  onChange,
  onKeyDown,
  onPaste,
  placeholder,
  className,
  spellCheck = false,
  disabled,
  type = "text",
}: VariableAutocompleteInputProps) {
  const { environments, activeEnvironmentId, sessionVariables } = useStore();
  const [suggestions, setSuggestions] = useState<VariableSuggestion[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const triggerStart = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const allVars = useMemo(() => {
    const env = environments.find((e) => e.id === activeEnvironmentId);
    const vars = new Map<string, VariableSuggestion>();
    for (const v of (env?.variables ?? [])) {
      if (v.enabled !== false && v.key.trim()) {
        vars.set(v.key.trim(), {
          name: v.key.trim(),
          source: "environment",
          value: v.value,
          sensitive: v.sensitive || isSensitiveVariableName(v.key),
        });
      }
    }
    for (const [key, val] of Object.entries(sessionVariables)) {
      if (key.trim()) {
        vars.set(key.trim(), {
          name: key.trim(),
          source: "session",
          value: val,
          sensitive: isSensitiveVariableName(key),
        });
      }
    }
    DYNAMIC_VARS.forEach((name) => vars.set(name, { name, source: "dynamic" }));
    return [...vars.values()];
  }, [environments, activeEnvironmentId, sessionVariables]);

  const variableTitle = useMemo(() => {
    const names = [...value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map((match) =>
      String(match[1]).trim(),
    );
    if (!names.length) return undefined;
    const byName = new Map(allVars.map((variable) => [variable.name, variable]));
    return [...new Set(names)]
      .map((name) => {
        const found = byName.get(name);
        if (!found) return `${name}: unresolved`;
        if (found.source === "dynamic") return `${name}: dynamic`;
        const preview = found.sensitive ? maskedValue(found.value ?? "") : (found.value ?? "");
        return `${name}: ${preview || "(empty)"} (${found.source})`;
      })
      .join("\n");
  }, [allVars, value]);

  const detectTrigger = (val: string, cursor: number) => {
    const before = val.slice(0, cursor);
    const lastOpen = before.lastIndexOf("{{");
    if (lastOpen === -1) return { active: false, start: -1, partial: "" };
    const afterOpen = before.slice(lastOpen + 2);
    if (afterOpen.includes("}}")) return { active: false, start: -1, partial: "" };
    return { active: true, start: lastOpen, partial: afterOpen };
  };

  const updateInputValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    const cursor = e.target.selectionStart ?? val.length;
    const { active, start, partial } = detectTrigger(val, cursor);
    if (active) {
      const filtered = allVars.filter((v) =>
        v.name.toLowerCase().startsWith(partial.toLowerCase()),
      );
      setSuggestions(filtered);
      triggerStart.current = start;
      setSelectedIdx(0);
    } else {
      setSuggestions([]);
      triggerStart.current = -1;
    }
  };

  const applySuggestion = useCallback((varName: string) => {
    const input = inputRef.current;
    if (!input || triggerStart.current === -1) return;
    const before = value.slice(0, triggerStart.current);
    const after = value.slice(input.selectionStart ?? value.length);
    const newVal = `${before}{{${varName}}}${after}`;
    onChange(newVal);
    setSuggestions([]);
    triggerStart.current = -1;
    requestAnimationFrame(() => {
      const pos = before.length + varName.length + 4;
      input.setSelectionRange(pos, pos);
      input.focus();
    });
  }, [value, onChange]);

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
        applySuggestion(suggestions[selectedIdx]?.name ?? "");
        return;
      }
      if (e.key === "Escape") {
        setSuggestions([]);
        triggerStart.current = -1;
        return;
      }
    }
    onKeyDown?.(e);
  };

  return (
    <div className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        onChange={updateInputValue}
        onKeyDown={handleKeyDown}
        onPaste={onPaste}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder={placeholder}
        aria-label={placeholder ?? "Value"}
        className={className}
        spellCheck={spellCheck}
        disabled={disabled}
        title={variableTitle}
      />
      {suggestions.length > 0 && (
        <SuggestionList
          suggestions={suggestions}
          selectedIndex={selectedIdx}
          onSelect={applySuggestion}
        />
      )}
    </div>
  );
}
