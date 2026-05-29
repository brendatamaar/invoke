import { Dialog } from "../../../../components/shared/Dialog";

export function EnvironmentExportDialog({
  open,
  onClose,
  onExportNonSensitive,
  onExportAll,
}: {
  open: boolean;
  onClose: () => void;
  onExportNonSensitive: () => void;
  onExportAll: () => void;
}) {
  return (
    <div
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <Dialog
        open={open}
        onClose={onClose}
        title="Export Environment"
        width="420px"
        footer={
          <>
            <button type="button" className="btn text-xs" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary text-xs" onClick={onExportNonSensitive}>
              Export non-sensitive
            </button>
            <button type="button" className="btn btn-danger text-xs" onClick={onExportAll}>
              Export all
            </button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-2)]">
          This environment contains sensitive variables. Choose whether to exclude sensitive values
          or include every value in the exported .env file.
        </p>
      </Dialog>
    </div>
  );
}
