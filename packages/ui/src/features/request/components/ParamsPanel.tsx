import type { KeyValue } from "@invoke/core";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";

const SECTION_HEADER =
  "px-3 py-1.5 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wide border-b border-[var(--border)] bg-[var(--surface-2)]";

export function ParamsPanel({
  params,
  pathVariables,
  onParamsChange,
  onPathVariablesChange,
}: {
  params: KeyValue[];
  pathVariables: KeyValue[];
  onParamsChange: (rows: KeyValue[]) => void;
  onPathVariablesChange: (rows: KeyValue[]) => void;
}) {
  return (
    <div className="flex flex-col">
      <div>
        <div className={SECTION_HEADER}>Query Parameters</div>
        <KeyValueEditor
          rows={params}
          onChange={(rows) => onParamsChange(rows as KeyValue[])}
          keyPlaceholder="param"
          valuePlaceholder="value"
        />
      </div>
      <div className="border-t border-[var(--border)]">
        <div className={SECTION_HEADER}>Path Variables</div>
        <KeyValueEditor
          rows={pathVariables}
          onChange={(rows) => onPathVariablesChange(rows as KeyValue[])}
          keyPlaceholder="param"
          valuePlaceholder="value"
        />
      </div>
    </div>
  );
}
