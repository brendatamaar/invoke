import { MinusCircle, Plus } from "lucide-react";
import type { HistoryEntry } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";

export function DiffSelectors({
  history,
  leftId,
  rightId,
  ignoreRules,
  newPath,
  onLeftChange,
  onRightChange,
  onNewPathChange,
  onAddIgnorePath,
  onRemoveIgnorePath,
}: {
  history: HistoryEntry[];
  leftId: string;
  rightId: string;
  ignoreRules: { id: string; path: string }[];
  newPath: string;
  onLeftChange: (id: string) => void;
  onRightChange: (id: string) => void;
  onNewPathChange: (path: string) => void;
  onAddIgnorePath: (path: string) => void;
  onRemoveIgnorePath: (id: string) => void;
}) {
  return (
    <div className="flex gap-3 px-4 py-3 border-b border-[var(--border)]">
      <HistorySelect
        label="Left (baseline)"
        value={leftId}
        history={history}
        onChange={onLeftChange}
      />
      <HistorySelect
        label="Right (comparison)"
        value={rightId}
        history={history}
        onChange={onRightChange}
      />
      <div className="flex-1">
        <label className="text-2xs text-[var(--text-3)] block mb-1">Ignore paths</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {ignoreRules.map((rule) => (
            <span
              key={rule.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-2xs font-mono text-[var(--text-1)]"
            >
              {rule.path}
              <button
                onClick={() => onRemoveIgnorePath(rule.id)}
                className="text-[var(--text-3)] hover:text-[var(--danger)] ml-0.5"
              >
                <MinusCircle size={10} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={newPath}
            onChange={(event) => onNewPathChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAddIgnorePath(newPath);
            }}
            placeholder="body.timestamp"
            className="input text-2xs py-0.5 flex-1 font-mono"
          />
          <button
            onClick={() => onAddIgnorePath(newPath)}
            className="btn text-2xs py-0.5 px-2 flex items-center gap-1"
          >
            <Plus size={10} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

function HistorySelect({
  label,
  value,
  history,
  onChange,
}: {
  label: string;
  value: string;
  history: HistoryEntry[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex-1">
      <label className="text-2xs text-[var(--text-3)] block mb-1">{label}</label>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select response...</option>
        {history.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entryLabel(entry)}
          </option>
        ))}
      </Select>
    </div>
  );
}

function entryLabel(entry: HistoryEntry) {
  const request = entry.request as { method?: string; url?: string } | undefined;
  return `${request?.method ?? "GET"} ${(request?.url ?? "-").slice(0, 60)}`;
}
