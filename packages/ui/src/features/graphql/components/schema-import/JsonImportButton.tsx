import { FileUp } from "lucide-react";
import type { RefObject } from "react";

export function JsonImportButton({
  working,
  inputRef,
  onImport,
  label,
}: {
  working: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onImport: (file: File | undefined) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => onImport(e.target.files?.[0])}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={working}
        className="btn text-xs gap-1.5"
      >
        <FileUp size={13} />
        {label}
      </button>
      <span className="text-2xs text-[var(--text-3)]">
        Introspection result JSON
      </span>
    </div>
  );
}
