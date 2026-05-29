import { ConfirmModal } from "../../../../components/shared/ConfirmModal";
import { PromptModal } from "../../../../components/shared/PromptModal";

export function CollectionNodeModals({
  collectionName,
  description,
  addFolderOpen,
  addRequestOpen,
  renameOpen,
  deleteOpen,
  descriptionOpen,
  onAddFolder,
  onAddRequest,
  onRename,
  onDelete,
  onSaveDescription,
  onCloseAddFolder,
  onCloseAddRequest,
  onCloseRename,
  onCloseDelete,
  onCloseDescription,
}: {
  collectionName: string;
  description?: string;
  addFolderOpen: boolean;
  addRequestOpen: boolean;
  renameOpen: boolean;
  deleteOpen: boolean;
  descriptionOpen: boolean;
  onAddFolder: (name: string) => void;
  onAddRequest: (name: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onSaveDescription: (description: string) => void;
  onCloseAddFolder: () => void;
  onCloseAddRequest: () => void;
  onCloseRename: () => void;
  onCloseDelete: () => void;
  onCloseDescription: () => void;
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
      <PromptModal
        open={descriptionOpen}
        title={`Description - ${collectionName}`}
        label="Description"
        defaultValue={description ?? ""}
        placeholder="Describe this collection..."
        multiline
        confirmLabel="Save"
        allowEmpty
        onConfirm={onSaveDescription}
        onClose={onCloseDescription}
      />
    </>
  );
}
