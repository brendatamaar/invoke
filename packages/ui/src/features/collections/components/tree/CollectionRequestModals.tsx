import { ConfirmModal } from "../../../../components/shared/ConfirmModal";
import { PromptModal } from "../../../../components/shared/PromptModal";

export function CollectionRequestModals({
  requestName,
  duplicateName,
  confirmDisconnect,
  confirmDelete,
  onDuplicate,
  onDuplicateClose,
  onConfirmDisconnect,
  onDisconnectClose,
  onConfirmDelete,
  onDeleteClose,
}: {
  requestName: string;
  duplicateName: string | null;
  confirmDisconnect: boolean;
  confirmDelete: boolean;
  onDuplicate: (name: string) => void;
  onDuplicateClose: () => void;
  onConfirmDisconnect: () => void;
  onDisconnectClose: () => void;
  onConfirmDelete: () => void;
  onDeleteClose: () => void;
}) {
  return (
    <>
      <PromptModal
        open={duplicateName !== null}
        title="Duplicate Request"
        label="Name"
        defaultValue={duplicateName ?? ""}
        confirmLabel="Duplicate"
        onConfirm={onDuplicate}
        onClose={onDuplicateClose}
      />
      <ConfirmModal
        open={confirmDisconnect}
        title="Active WebSocket Connection"
        message="Switching requests will disconnect the active session. Continue?"
        confirmLabel="Disconnect & Load"
        danger
        onConfirm={onConfirmDisconnect}
        onClose={onDisconnectClose}
      />
      <ConfirmModal
        open={confirmDelete}
        title="Delete Request"
        message={
          <span className="flex flex-col gap-2">
            <span>Are you sure you want to delete:</span>
            <strong className="break-all">{requestName}</strong>
            <span>This action cannot be undone.</span>
          </span>
        }
        confirmLabel="Delete"
        danger
        onConfirm={onConfirmDelete}
        onClose={onDeleteClose}
      />
    </>
  );
}
