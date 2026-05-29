import type { RefObject } from "react";
import { Download, Upload } from "lucide-react";
import { SectionTitle } from "../shared/SectionTitle";

export function BackupTab({
  backupInputRef,
  onExportWorkspace,
  onImportWorkspace,
}: {
  backupInputRef: RefObject<HTMLInputElement | null>;
  onExportWorkspace: () => void;
  onImportWorkspace: (file?: File) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <SectionTitle
        title="Workspace backup"
        description="Export or import collections, environments, and flows as JSON."
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2 rounded-md bg-[var(--bg-2)] p-4">
          <button
            type="button"
            onClick={onExportWorkspace}
            className="btn btn-primary flex items-center justify-center gap-2 text-xs"
          >
            <Download size={13} />
            Export workspace
          </button>
          <p className="text-2xs text-[var(--text-3)]">
            Save the current workspace to a timestamped JSON file.
          </p>
        </div>

        <div className="flex flex-col gap-2 rounded-md bg-[var(--bg-2)] p-4">
          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            aria-label="Import workspace file"
            className="hidden"
            onChange={(e) => onImportWorkspace(e.currentTarget.files?.[0])}
          />
          <button
            type="button"
            onClick={() => backupInputRef.current?.click()}
            className="btn flex items-center justify-center gap-2 text-xs"
          >
            <Upload size={13} />
            Import workspace
          </button>
          <p className="text-2xs text-[var(--text-3)]">
            Merge a workspace backup into the current local data.
          </p>
        </div>
      </div>
    </div>
  );
}
