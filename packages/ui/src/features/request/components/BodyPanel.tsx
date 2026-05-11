import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import type { BodyMode, KeyValue } from "@invoke/core";
import { CodeEditor } from "../../../components/editors/CodeEditor";
import { KeyValueEditor } from "../../../components/shared/KeyValueEditor";
import { useStore } from "../../../store";

export function BodyPanel() {
  const { request, setRequest } = useStore();
  const mode = (request.bodyMode ?? "none") as BodyMode;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[var(--border)]">
        {(["none", "json", "form-data", "urlencoded", "raw", "file"] as BodyMode[]).map(
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
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-1 px-2 py-1 border-b border-[var(--border)] bg-[var(--surface-2)]">
              <button
                onClick={() => {
                  try {
                    setRequest({ body: JSON.stringify(JSON.parse(request.body ?? ""), null, 2) });
                  } catch { /* not JSON, ignore */ }
                }}
                className="tab-btn text-2xs"
                title="Format JSON"
              >
                Format
              </button>
              <button
                onClick={() => {
                  try {
                    setRequest({ body: JSON.stringify(JSON.parse(request.body ?? "")) });
                  } catch { /* not JSON, ignore */ }
                }}
                className="tab-btn text-2xs"
                title="Minify JSON"
              >
                Minify
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <CodeEditor
                value={request.body ?? ""}
                onChange={(value) => setRequest({ body: value })}
                lang={mode === "json" ? "json" : "text"}
              />
            </div>
          </div>
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
        {mode === "file" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setRequest({ body: reader.result as string });
                  setFileName(file.name);
                };
                reader.readAsDataURL(file);
                e.target.value = "";
              }}
            />
            {request.body && mode === "file" ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded text-xs">
                <Upload size={12} className="text-[var(--accent)]" />
                <span className="font-mono text-[var(--text-1)]">{fileName || "file selected"}</span>
                <button
                  onClick={() => { setRequest({ body: "" }); setFileName(""); }}
                  className="ml-1 text-[var(--text-3)] hover:text-[var(--danger)]"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn border-dashed border-2 px-6 py-3 flex items-center gap-2 text-xs text-[var(--text-2)] hover:text-[var(--text-1)]"
              >
                <Upload size={14} /> Choose file
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
