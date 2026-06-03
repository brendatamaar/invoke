import { ConfirmModal } from "../../../../components/shared/ConfirmModal";
import { PromptModal } from "../../../../components/shared/PromptModal";

export function CollectionNodeModals({
  collectionName,
  addFolderOpen,
  addRequestOpen,
  renameOpen,
  deleteOpen,
  onAddFolder,
  onAddRequest,
  onRename,
  onDelete,
  onCloseAddFolder,
  onCloseAddRequest,
  onCloseRename,
  onCloseDelete,
}: {
  collectionName: string;
  addFolderOpen: boolean;
  addRequestOpen: boolean;
  renameOpen: boolean;
  deleteOpen: boolean;
  onAddFolder: (name: string) => void;
  onAddRequest: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onCloseAddFolder: () => void;
  onCloseAddRequest: () => void;
  onCloseRename: () => void;
  onCloseDelete: () => void;
}) {
  return (
    <>
      <PromptModal
        open={addFolderOpen}
        title="New Folder"
        label="Name"
        placeholder="My Folder"
        onConfirm={onAddFolder}
        onClose={onCloseAddFolder}
      />
      <PromptModal
        open={addRequestOpen}
        title="New Request"
        label="Name"
        defaultValue="New Request"
        onConfirm={onAddRequest}
        onClose={onCloseAddRequest}
      />
      <PromptModal
        open={renameOpen}
        title="Rename Collection"
        label="Name"
        defaultValue={collectionName}
        onConfirm={onRename}
        onClose={onCloseRename}
      />
      <ConfirmModal
        open={deleteOpen}
        title="Delete Collection"
        message={
          <span className="flex flex-col gap-2">
            <span>Are you sure you want to delete:</span>
            <strong className="break-all">{collectionName}</strong>
            <span>This action cannot be undone.</span>
          </span>
        }
        confirmLabel="Delete"
        danger
        onConfirm={onDelete}
        onClose={onCloseDelete}
      />
    </>
  );
}
