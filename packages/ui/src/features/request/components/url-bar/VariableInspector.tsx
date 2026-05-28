import { Braces } from "lucide-react";
import { SCOPE_LABEL } from "./constants";

export function VariableInspector({
  open,
  scopedVars,
  unresolved,
  onToggle,
}: {
  open: boolean;
  scopedVars: Array<{ key: string; value: string; scope: string }>;
  unresolved: string[];
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        title="Active variables"
        className={`p-1.5 rounded border text-xs transition-colors ${open ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)]"}`}
      >
        <Braces size={13} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-[var(--surface)] border border-[var(--border)] rounded shadow-[var(--shadow-2)] py-1"
          style={{ minWidth: 280, maxHeight: 320, overflowY: "auto" }}
        >
          <p className="px-3 py-1.5 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wide border-b border-[var(--border)]">
            Active variables
          </p>
          {scopedVars.length === 0 ? (
            <p className="px-3 py-3 text-2xs text-[var(--text-3)]">No variables defined</p>
          ) : (
            scopedVars.map((variable) => <VariableRow key={variable.key} variable={variable} />)
          )}
          {unresolved.length > 0 && (
            <>
              <p className="px-3 py-1.5 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wide border-t border-[var(--border)] mt-1">
                Unresolved
              </p>
              {unresolved.map((name) => (
                <div key={name} className="flex items-center gap-2 px-3 py-1">
                  <span className="font-mono text-2xs text-[var(--warn)] flex-1">{name}</span>
                  <span className="text-2xs text-[var(--text-3)]">not defined</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function VariableRow({ variable }: { variable: { key: string; value: string; scope: string } }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 hover:bg-[var(--surface-2)]">
      <span className="font-mono text-2xs text-[var(--text-1)] flex-1 truncate">
        {variable.key}
      </span>
      <span className="font-mono text-2xs text-[var(--accent)] truncate max-w-28">
        {variable.value}
      </span>
      <span className="text-2xs text-[var(--text-3)] shrink-0">
        {SCOPE_LABEL[variable.scope] ?? variable.scope}
      </span>
    </div>
  );
}
