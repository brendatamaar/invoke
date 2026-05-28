import type { KeyValue } from "@invoke/core";
import { KeyValueEditor } from "../../../../components/shared/KeyValueEditor";

export function RouteHeadersEditor({
  headers,
  onHeadersChange,
}: {
  headers: KeyValue[];
  onHeadersChange: (headers: KeyValue[]) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-[var(--text-2)]">Response headers</label>
      <div className="border border-[var(--border)] rounded overflow-hidden">
        <KeyValueEditor
          rows={headers}
          onChange={onHeadersChange}
          keyPlaceholder="Content-Type"
          valuePlaceholder="application/json"
        />
      </div>
    </div>
  );
}
