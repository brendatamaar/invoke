import type { Collection, Folder } from "@invoke/core";
import { Select } from "../../../../components/shared/Select";

export const NEW_COLLECTION_SENTINEL = "__new_col__";
export const NEW_FOLDER_SENTINEL = "__new_folder__";

export function DestinationPicker({
  collections,
  folders,
  collectionId,
  folderId,
  onCollectionChange,
  onFolderChange,
}: {
  collections: Collection[];
  folders: Folder[];
  collectionId: string;
  folderId: string;
  onCollectionChange: (id: string) => void;
  onFolderChange: (id: string) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-3)]">Collection</span>
        <Select
          value={collectionId}
          onChange={(event) => onCollectionChange(event.target.value)}
          size="sm"
        >
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
          <option value={NEW_COLLECTION_SENTINEL}>+ New collection...</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-3)]">Folder (optional)</span>
        <Select value={folderId} onChange={(event) => onFolderChange(event.target.value)} size="sm">
          <option value="">No folder</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
          <option value={NEW_FOLDER_SENTINEL}>+ New folder...</option>
        </Select>
      </div>
    </>
  );
}
