import { useRef, useState, type RefObject } from "react";
import { Download, Pencil, Upload, X } from "lucide-react";

export function EnvironmentModalHeader({
  name,
  fileInputRef,
  onNameChange,
  onImportFile,
  onRequestExport,
  onClose,
}: {
  name: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onNameChange: (name: string) => void;
  onImportFile: (file?: File) => void;
  onRequestExport: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
      <div
        className="flex-1 flex items-center gap-1.5 group cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <input
          ref={inputRef}
          id="env-modal-name"
          aria-label="Environment name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold text-[var(--text-1)] placeholder-[var(--text-3)] border-b border-transparent group-hover:border-[var(--border)] focus:border-[var(--text-3)] transition-colors"
          placeholder="Environment name"
        />
        {!focused && (
          <Pencil
            size={11}
            className="text-[var(--text-3)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          />
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".env,text/plain"
          className="hidden"
          aria-label="Import .env file"
          onChange={(event) => onImportFile(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn text-2xs py-0.5 px-2 flex items-center gap-1"
          title="Import .env"
        >
          <Upload size={11} /> Import
        </button>
        <button
          type="button"
          onClick={onRequestExport}
          className="btn text-2xs py-0.5 px-2 flex items-center gap-1"
          title="Export .env"
        >
          <Download size={11} /> Export
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)] ml-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}
