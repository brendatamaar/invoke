import type { BodyMode } from "@invoke/core";
import { CodeEditor } from "../../../../components/editors/CodeEditor";
import { useStore } from "../../../../store";

export function RawBodyEditor({
  mode,
  body,
  onChange,
}: {
  mode: BodyMode;
  body: string;
  onChange: (body: string) => void;
}) {
  const addToast = useStore((s) => s.addToast);

  const reformat = (pretty: boolean) => {
    try {
      const parsed = JSON.parse(body ?? "") as unknown;
      onChange(pretty ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed));
    } catch (error) {
      addToast("error", `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-[var(--border)] bg-[var(--surface-2)]">
        <button
          type="button"
          onClick={() => reformat(true)}
          className="tab-btn text-2xs"
          title="Format JSON"
        >
          Format
        </button>
        <button
          type="button"
          onClick={() => reformat(false)}
          className="tab-btn text-2xs"
          title="Minify JSON"
        >
          Minify
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <CodeEditor value={body} onChange={onChange} lang={mode === "json" ? "json" : "text"} />
      </div>
    </div>
  );
}
