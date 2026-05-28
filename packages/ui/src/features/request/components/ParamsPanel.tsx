import { extractPathVariableNames, type KeyValue } from "@invoke/core";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";

const SECTION_HEADER =
  "px-3 py-1.5 text-2xs font-semibold text-[var(--text-3)] uppercase tracking-wide border-b border-[var(--border)] bg-[var(--surface-2)]";

export function ParamsPanel({
  url,
  params,
  pathVariables,
  onParamsChange,
  onPathVariablesChange,
}: {
  url: string;
  params: KeyValue[];
  pathVariables: KeyValue[];
  onParamsChange: (rows: KeyValue[]) => void;
  onPathVariablesChange: (rows: KeyValue[]) => void;
}) {
  const pathVarNames = extractPathVariableNames(url);
  const valueMap = new Map(pathVariables.map((variable) => [variable.key, variable.value]));

  return (
    <div className="flex flex-col">
      <div>
        {pathVarNames.length > 0 && <div className={SECTION_HEADER}>Query Parameters</div>}
        <KeyValueEditor
          rows={params}
          onChange={(rows) => onParamsChange(rows as KeyValue[])}
          keyPlaceholder="param"
          valuePlaceholder="value"
        />
      </div>
      {pathVarNames.length > 0 && (
        <div className="border-t border-[var(--border)]">
          <div className={SECTION_HEADER}>Path Variables</div>
          <div className="grid grid-cols-[1fr_1px_1fr] items-center text-2xs text-[var(--text-3)] py-1 border-b border-[var(--border)] px-3">
            <span>Key</span>
            <span />
            <span className="pl-2">Value</span>
          </div>
          {pathVarNames.map((name) => (
            <PathVariableRow
              key={name}
              name={name}
              value={valueMap.get(name) ?? ""}
              pathVarNames={pathVarNames}
              valueMap={valueMap}
              onPathVariablesChange={onPathVariablesChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PathVariableRow({
  name,
  value,
  pathVarNames,
  valueMap,
  onPathVariablesChange,
}: {
  name: string;
  value: string;
  pathVarNames: string[];
  valueMap: Map<string, string>;
  onPathVariablesChange: (rows: KeyValue[]) => void;
}) {
  const filled = value.trim() !== "";
  return (
    <div className="grid grid-cols-[1fr_1px_1fr] items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
      <span className="px-3 py-1.5 text-xs font-mono text-[var(--text-2)]">:{name}</span>
      <span className="h-4 bg-[var(--border)]" />
      <input
        type="text"
        value={value}
        onChange={(event) => {
          const next = pathVarNames.map((pathName) => ({
            key: pathName,
            value: pathName === name ? event.target.value : (valueMap.get(pathName) ?? ""),
            enabled: true,
          }));
          onPathVariablesChange(next);
        }}
        placeholder="value"
        className={`w-full bg-transparent border-0 outline-none py-1.5 px-2 text-xs font-mono placeholder-[var(--text-3)] min-w-0 ${filled ? "text-[var(--success,#22c55e)]" : "text-[var(--warn)]"}`}
      />
    </div>
  );
}
