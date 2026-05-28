import { useRef } from "react";
import { Upload, X } from "lucide-react";

export function FileBodyEditor({
  body,
  fileName,
  onChange,
}: {
  body: string;
  fileName?: string;
  onChange: (body: string, fileName: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) onChange(reader.result as string, file.name);
          };
          reader.onerror = () => onChange("", "");
          reader.readAsDataURL(file);
          event.target.value = "";
        }}
      />
      {body ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded text-xs">
          <Upload size={12} className="text-[var(--accent)]" />
          <span className="font-mono text-[var(--text-1)]">{fileName || "file selected"}</span>
          <button
            onClick={() => onChange("", "")}
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
  );
}
