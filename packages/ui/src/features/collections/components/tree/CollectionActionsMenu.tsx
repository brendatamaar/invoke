import {
  Download,
  Edit3,
  FileText,
  FolderPlus,
  MoreHorizontal,
  Play,
  Plus,
  Trash2,
  Variable,
} from "lucide-react";
import { CollectionMenuItem } from "../CollectionMenuItem";

export function CollectionActionsMenu({
  open,
  menuRef,
  onToggle,
  onNewRequest,
  onNewFolder,
  onRename,
  onVariables,
  onDescription,
  onRun,
  onExportZip,
  onExportOpenApi,
  onDelete,
}: {
  open: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  onNewRequest: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onVariables: () => void;
  onDescription: () => void;
  onRun: () => void;
  onExportZip: () => void;
  onExportOpenApi: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      ref={menuRef}
      className="opacity-0 group-hover:opacity-100 relative ml-1"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onToggle}
        className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[160px]">
          <CollectionMenuItem
            icon={<Plus size={12} />}
            label="New Request"
            onClick={onNewRequest}
          />
          <CollectionMenuItem
            icon={<FolderPlus size={12} />}
            label="New Folder"
            onClick={onNewFolder}
          />
          <CollectionMenuItem icon={<Edit3 size={12} />} label="Rename" onClick={onRename} />
          <CollectionMenuItem
            icon={<Variable size={12} />}
            label="Variables"
            onClick={onVariables}
          />
          <CollectionMenuItem
            icon={<FileText size={12} />}
            label="Description"
            onClick={onDescription}
          />
          <CollectionMenuItem icon={<Play size={12} />} label="Run" onClick={onRun} />
          <CollectionMenuItem
            icon={<Download size={12} />}
            label="Export ZIP"
            onClick={onExportZip}
          />
          <CollectionMenuItem
            icon={<Download size={12} />}
            label="Export OpenAPI"
            onClick={onExportOpenApi}
          />
          <div className="h-px bg-[var(--border)] my-1" />
          <CollectionMenuItem
            icon={<Trash2 size={12} />}
            label="Delete"
            onClick={onDelete}
            danger
          />
        </div>
      )}
    </div>
  );
}
