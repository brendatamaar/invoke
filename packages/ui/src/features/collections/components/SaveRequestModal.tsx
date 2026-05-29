import { useEffect, useReducer, useRef } from "react";
import { FolderOpen, X } from "lucide-react";
import { useStore, coreStore } from "../../../store";
import { useCollections, useFolders } from "../../../hooks/useDb";
import { NEW_COLLECTION_SENTINEL, NEW_FOLDER_SENTINEL } from "./save/DestinationPicker";
import { SaveRequestForm } from "./save/SaveRequestForm";

export function SaveRequestModal() {
  const { saveDialog, set, request, addToast, setRequest } = useStore();
  const collections = useCollections();
  const folders = useFolders();
  const inputRef = useRef<HTMLInputElement>(null);
  const newColInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);
  type FormState = { name: string; collectionId: string; newCollectionName: string; folderId: string; newFolderName: string };
  const [formState, formDispatch] = useReducer(
    (prev: FormState, patch: Partial<FormState>) => ({ ...prev, ...patch }),
    { name: "", collectionId: "", newCollectionName: "", folderId: "", newFolderName: "" },
  );
  const { name, collectionId, newCollectionName, folderId, newFolderName } = formState;
  const setName = (v: string) => formDispatch({ name: v });
  const setCollectionId = (v: string) => {
    formDispatch({ collectionId: v, folderId: "", newFolderName: "" });
    if (v === NEW_COLLECTION_SENTINEL) setTimeout(() => newColInputRef.current?.focus(), 50);
  };
  const setNewCollectionName = (v: string) => formDispatch({ newCollectionName: v });
  const setFolderId = (v: string) => {
    formDispatch({ folderId: v });
    if (v === NEW_FOLDER_SENTINEL) setTimeout(() => newFolderInputRef.current?.focus(), 50);
  };
  const setNewFolderName = (v: string) => formDispatch({ newFolderName: v });
  const isNewCollection = collectionId === NEW_COLLECTION_SENTINEL;
  const isNewFolder = folderId === NEW_FOLDER_SENTINEL;

  useEffect(() => {
    if (!saveDialog.open) return;
    formDispatch({
      name: saveDialog.name,
      collectionId: saveDialog.collectionId || collections[0]?.id || "",
      folderId: saveDialog.folderId || "",
      newCollectionName: "",
      newFolderName: "",
    });
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [collections, saveDialog]);

  const closeRef = useRef<() => void>(() => {});
  const confirmRef = useRef<() => void>(() => {});

  const close = () => set({ saveDialog: { ...saveDialog, open: false } });
  const availableFolders = folders.filter((folder) => folder.collectionId === collectionId);
  const canSave =
    name.trim() &&
    (isNewCollection ? newCollectionName.trim() : collectionId) &&
    (isNewFolder ? newFolderName.trim() : true);

  const confirm = async () => {
    if (!canSave) return;
    try {
      const targetCollectionId = await resolveCollectionId(collectionId, newCollectionName);
      const targetFolderId = await resolveFolderId(folderId, newFolderName, targetCollectionId);
      const {
        id: _id,
        collectionId: _col,
        folderId: _folder,
        ...requestBody
      } = request as unknown as Record<string, unknown>;
      const saved = await coreStore.saveRequest(
        requestBody as unknown as Parameters<typeof coreStore.saveRequest>[0],
        name.trim(),
        targetCollectionId,
        { folderId: targetFolderId },
      );
      set({ requests: await coreStore.listRequests(), saveDialog: { ...saveDialog, open: false } });
      setRequest({
        id: saved.id,
        name: saved.name,
        collectionId: saved.collectionId,
        folderId: saved.folderId ?? undefined,
      });
      addToast("success", "Request saved to collection");
    } catch (error) {
      addToast("error", String(error));
    }
  };

  closeRef.current = close;
  confirmRef.current = () => { if (canSave) void confirm(); };

  useEffect(() => {
    if (!saveDialog.open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Enter") { e.preventDefault(); confirmRef.current(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [saveDialog.open]);

  if (!saveDialog.open) return null;
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <dialog
        open
        aria-label="Save to Collection"
        className="bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-pop)] flex flex-col p-0"
        style={{ width: 400 }}
      >
        <form method="dialog" className="flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
          <FolderOpen size={15} className="text-[var(--accent)]" />
          <span className="text-sm font-semibold text-[var(--text-1)]">Save to Collection</span>
          <button
            type="button"
            onClick={close}
            className="ml-auto p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-3)]"
          >
            <X size={15} />
          </button>
        </div>
        <SaveRequestForm
          name={name}
          collectionId={collectionId}
          folderId={folderId}
          newCollectionName={newCollectionName}
          newFolderName={newFolderName}
          collections={collections}
          availableFolders={availableFolders}
          inputRef={inputRef}
          newColInputRef={newColInputRef}
          newFolderInputRef={newFolderInputRef}
          onNameChange={setName}
          onCollectionChange={setCollectionId}
          onFolderChange={setFolderId}
          onNewCollectionNameChange={setNewCollectionName}
          onNewFolderNameChange={setNewFolderName}
        />
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button type="button" onClick={close} className="btn btn-ghost text-xs px-3 py-1.5">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canSave}
            className="btn btn-primary text-xs px-3 py-1.5"
          >
            Save
          </button>
        </div>
        </form>
      </dialog>
    </div>
  );
}

async function resolveCollectionId(collectionId: string, newName: string) {
  if (collectionId !== NEW_COLLECTION_SENTINEL) return collectionId;
  return (await coreStore.createCollection(newName.trim())).id;
}

async function resolveFolderId(folderId: string, newName: string, collectionId: string) {
  if (!folderId) return null;
  if (folderId !== NEW_FOLDER_SENTINEL) return folderId;
  return (await coreStore.createFolder(collectionId, newName.trim())).id;
}
