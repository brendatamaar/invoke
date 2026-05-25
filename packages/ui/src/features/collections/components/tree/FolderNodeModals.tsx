import { ConfirmModal } from "../../../../components/shared/ConfirmModal";
import { PromptModal } from "../../../../components/shared/PromptModal";

export function FolderNodeModals({
  folderName,
  description,
  deleteOpen,
  descriptionOpen,
  onConfirmDelete,
  onDeleteClose,
  onSaveDescription,
  onDescriptionClose,
}: {
  folderName: string;
  description?: string;
  deleteOpen: boolean;
  descriptionOpen: boolean;
  onConfirmDelete: () => void;
  onDeleteClose: () => void;
  onSaveDescription: (description: string) => void;
  onDescriptionClose: () => void;
}) {
  return (
    <>
      <ConfirmModal
        open={deleteOpen}
        title="Delete Folder"
        message={
          <span className="flex flex-col gap-2">
            <span>Are you sure you want to delete:</span>
            <strong className="break-all">{folderName}</strong>
            <span>This action cannot be undone.</span>
          </span>
        }
        confirmLabel="Delete"
        danger
        onConfirm={onConfirmDelete}
        onClose={onDeleteClose}
      />
      <PromptModal
        open={descriptionOpen}
        title={`Description - ${folderName}`}
        label="Description"
        defaultValue={description ?? ""}
        placeholder="Describe this folder..."
        multiline
        confirmLabel="Save"
        allowEmpty
        onConfirm={onSaveDescription}
        onClose={onDescriptionClose}
      />
    </>
  );
}
