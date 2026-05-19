import { useEffect, useRef, useState } from "react";
import { FolderOpen, X } from "lucide-react";
import { useStore, coreStore } from "../../../store";
import { Select } from "../../../components/shared/Select";

const NEW_COLLECTION_SENTINEL = "__new_col__";
const NEW_FOLDER_SENTINEL = "__new_folder__";

export function SaveRequestModal() {
  const { saveDialog, set, request, collections, folders, addToast, setRequest } =
    useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const newColInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [folderId, setFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  const isNewCollection = collectionId === NEW_COLLECTION_SENTINEL;
  const isNewFolder = folderId === NEW_FOLDER_SENTINEL;

  useEffect(() => {
    if (saveDialog.open) {
      setName(saveDialog.name);
      const firstCol = collections[0]?.id ?? "";
      setCollectionId(saveDialog.collectionId || firstCol);
      setFolderId(saveDialog.folderId || "");
      setNewCollectionName("");
      setNewFolderName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [saveDialog.open]); // eslint-disable-line

  useEffect(() => {
    setFolderId("");
    setNewFolderName("");
  }, [collectionId]);

  useEffect(() => {
    if (isNewCollection) setTimeout(() => newColInputRef.current?.focus(), 50);
  }, [isNewCollection]);

  useEffect(() => {
    if (isNewFolder) setTimeout(() => newFolderInputRef.current?.focus(), 50);
  }, [isNewFolder]);

  const close = () => set({ saveDialog: { ...saveDialog, open: false } });

  const availableFolders = isNewCollection
    ? []
    : folders.filter((f) => f.collectionId === collectionId);

  const canSave =
    name.trim() &&
    (isNewCollection ? newCollectionName.trim() : collectionId) &&
    (isNewFolder ? newFolderName.trim() : true);

  const confirm = async () => {
    if (!canSave) return;
    try {
      let targetCollectionId = collectionId;

      if (isNewCollection) {
        const created = await coreStore.createCollection(newCollectionName.trim());
        const updatedCols = await coreStore.listCollections();
        set({ collections: updatedCols });
        targetCollectionId = created.id;
      }

      let targetFolderId: string | null = folderId || null;

      if (isNewFolder) {
        const createdFolder = await coreStore.createFolder(
          targetCollectionId,
          newFolderName.trim(),
        );
        const updatedFolders = await coreStore.listFolders();
        set({ folders: updatedFolders });
        targetFolderId = createdFolder.id;
      }

      const { id: _id, collectionId: _col, folderId: _folder, ...requestBody } = request as unknown as Record<string, unknown>;
      const saved = await coreStore.saveRequest(
        requestBody as unknown as Parameters<typeof coreStore.saveRequest>[0],
        name.trim(),
        targetCollectionId,
        { folderId: targetFolderId },
      );
      const updated = await coreStore.listRequests();
      set({ requests: updated, saveDialog: { ...saveDialog, open: false } });
      setRequest({
        id: saved.id,
        name: saved.name,
        collectionId: saved.collectionId,
        folderId: saved.folderId ?? undefined,
      });
      addToast("success", "Request saved to collection");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") confirm();
    if (e.key === "Escape") close();
  };

  if (!saveDialog.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col"
        style={{ width: 400 }}
        onKeyDown={onKeyDown}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <FolderOpen size={15} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text-1)]">
            Save to Collection
          </span>
          <button
            onClick={close}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-3)]">Name</span>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Request name"
              className="input text-sm"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-3)]">Collection</span>
            <Select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              size="sm"
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={NEW_COLLECTION_SENTINEL}>+ New collection…</option>
            </Select>
          </div>

          {isNewCollection && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-3)]">Collection name</span>
              <input
                ref={newColInputRef}
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="My Collection"
                className="input text-sm"
              />
            </label>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-3)]">Folder (optional)</span>
            <Select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              size="sm"
            >
              <option value="">No folder</option>
              {availableFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
              <option value={NEW_FOLDER_SENTINEL}>+ New folder…</option>
            </Select>
          </div>

          {isNewFolder && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-3)]">Folder name</span>
              <input
                ref={newFolderInputRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="My Folder"
                className="input text-sm"
              />
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button onClick={close} className="btn btn-ghost text-xs px-3 py-1.5">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={!canSave}
            className="btn btn-primary text-xs px-3 py-1.5"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
