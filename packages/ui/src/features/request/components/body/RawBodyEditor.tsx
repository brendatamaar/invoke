import type { BodyMode } from "@invoke/core";
import { CodeEditor } from "../../../../components/editors/CodeEditor";

export function RawBodyEditor({
  mode,
  body,
  onChange,
}: {
  mode: BodyMode;
  body: string;
  onChange: (body: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <button onClick={() => formatJson(body, onChange)} className="tab-btn text-2xs" title="Format JSON">
          Format
        </button>
        <button onClick={() => minifyJson(body, onChange)} className="tab-btn text-2xs" title="Minify JSON">
          Minify
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor
          value={body}
          onChange={onChange}
          lang={mode === "json" ? "json" : "text"}
        />
      </div>
    </div>
  );
}

function formatJson(body: string, onChange: (body: string) => void) {
  try {
    onChange(JSON.stringify(JSON.parse(body ?? ""), null, 2));
  } catch {
    /* not JSON */
  }
}

function minifyJson(body: string, onChange: (body: string) => void) {
  try {
    onChange(JSON.stringify(JSON.parse(body ?? "")));
  } catch {
    /* not JSON */
  }
}
