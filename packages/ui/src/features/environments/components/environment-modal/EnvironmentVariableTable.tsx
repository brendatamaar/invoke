import { Eye, EyeOff, Lock, Plus, Unlock, X } from "lucide-react";
import { isSensitiveVariableName, type KeyValue } from "@invoke/core";

export function EnvironmentVariableTable({
  variables,
  revealed,
  onSetVar,
  onSetVariables,
  onToggleReveal,
}: {
  variables: KeyValue[];
  revealed: Set<number>;
  onSetVar: (index: number, field: keyof KeyValue, value: string | boolean) => void;
  onSetVariables: (variables: KeyValue[]) => void;
  onToggleReveal: (index: number) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-[8px_14px_8px_1fr_1px_1fr_32px] items-center border-b border-[var(--border)] text-2xs text-[var(--text-3)] bg-[var(--surface-2)]">
        <span />
        <span />
        <span />
        <span className="px-2 py-1.5">Key</span>
        <span />
        <span className="px-2 py-1.5">Value</span>
        <span />
      </div>

      {variables.map((variable, index) => (
        <div
          key={variable.key || `var-${index}`}
          className="grid grid-cols-[8px_14px_8px_1fr_1px_1fr_32px] items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]"
        >
          <span />
          <input
            type="checkbox"
            checked={variable.enabled !== false}
            onChange={(event) => onSetVar(index, "enabled", event.target.checked)}
            aria-label={`Enable variable ${variable.key || index}`}
            className="size-3.5"
          />
          <span />
          <input
            value={variable.key}
            onChange={(event) => {
              const key = event.target.value;
              onSetVariables(
                variables.map((item, variableIndex) =>
                  variableIndex === index
                    ? {
                        ...item,
                        key,
                        sensitive: item.sensitive || isSensitiveVariableName(key),
                      }
                    : item,
                ),
              );
            }}
            placeholder="KEY"
            aria-label={`Variable key ${index}`}
            className="w-full bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono min-w-0"
          />
          <span className="h-4 bg-[var(--border)]" />
          <div className="flex items-center min-w-0">
            <input
              type={variable.sensitive && !revealed.has(index) ? "password" : "text"}
              value={variable.value}
              onChange={(event) => onSetVar(index, "value", event.target.value)}
              placeholder="value"
              aria-label={`Variable value ${index}`}
              className="flex-1 bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono min-w-0"
            />
            <button
              type="button"
              onClick={() => onToggleReveal(index)}
              disabled={!variable.sensitive}
              className="px-1.5 text-[var(--text-3)] disabled:opacity-25 shrink-0"
              title={variable.sensitive ? "Toggle reveal" : "Value is public"}
            >
              {variable.sensitive && !revealed.has(index) ? (
                <EyeOff size={11} />
              ) : (
                <Eye size={11} />
              )}
            </button>
            <button
              type="button"
              onClick={() => onSetVar(index, "sensitive", !variable.sensitive)}
              className={`px-1.5 shrink-0 ${variable.sensitive ? "text-[var(--warn)]" : "text-[var(--text-3)]"}`}
              title={variable.sensitive ? "Mark public" : "Mark sensitive"}
            >
              {variable.sensitive ? <Lock size={11} /> : <Unlock size={11} />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onSetVariables(variables.filter((_, i) => i !== index))}
            className="flex items-center justify-center text-[var(--text-3)] hover:text-[var(--danger)]"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onSetVariables([...variables, { key: "", value: "", enabled: true }])}
        className="flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] w-full"
      >
        <Plus size={12} /> Add variable
      </button>
    </div>
  );
}
