import type { BodyMode, KeyValue } from "@invoke/core";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";
import { useStore } from "../../../store";

export function BodyPanel() {
  const { request, setRequest } = useStore();
  const mode = (request.bodyMode ?? "none") as BodyMode;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        {(["none", "json", "form-data", "urlencoded", "raw"] as BodyMode[]).map(
          (bodyMode) => (
            <button
              key={bodyMode}
              onClick={() => setRequest({ bodyMode })}
              className={`tab-btn text-2xs ${mode === bodyMode ? "active" : ""}`}
            >
              {bodyMode}
            </button>
          ),
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {mode === "none" && (
          <div className="flex items-center justify-center h-full text-xs text-[var(--text-3)]">
            No body
          </div>
        )}
        {(mode === "json" || mode === "raw") && (
          <CodeEditor
            value={request.body ?? ""}
            onChange={(value) => setRequest({ body: value })}
            lang={mode === "json" ? "json" : "text"}
          />
        )}
        {(mode === "form-data" || mode === "urlencoded") && (
          <KeyValueEditor
            rows={(() => {
              try {
                return JSON.parse(request.body || "[]") as KeyValue[];
              } catch {
                return [];
              }
            })()}
            onChange={(rows) => setRequest({ body: JSON.stringify(rows) })}
            keyPlaceholder="key"
            valuePlaceholder="value"
          />
        )}
      </div>
    </div>
  );
}
