import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Play,
  Trash2,
  Variable,
} from "lucide-react";
import type { Folder as FolderType } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { PromptModal } from "../../../components/shared/PromptModal";
import { CollectionMenuItem } from "./CollectionMenuItem";
import { CollectionRequestNode } from "./CollectionRequestNode";

export function CollectionFolderNode({
  folder,
  collectionId,
}: {
  folder: FolderType;
  collectionId: string;
}) {
  const { expandedFolderIds, toggleFolder, requests, set, addToast } =
    useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [descModal, setDescModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);
  const expanded = expandedFolderIds.includes(folder.id);
  const folderRequests = requests.filter((r) => r.folderId === folder.id);

  const openVariableEditor = () => {
    setMenuOpen(false);
    set({
      variableEditor: {
        open: true,
        kind: "folder",
        id: folder.id,
        name: folder.name,
        variables: folder.variables ?? [],
      },
    });
  };

  const deleteFolder = async () => {
    setDeleteModal(false);
    try {
      await coreStore.deleteFolder(folder.id);
      const [folds, reqs] = await Promise.all([
        coreStore.listFolders(),
        coreStore.listRequests(),
      ]);
      set({ folders: folds, requests: reqs });
      addToast("success", "Folder deleted");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(`collection/${collectionId}`)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const requestId = e.dataTransfer.getData("requestId");
    const sourceCollectionId = e.dataTransfer.getData("collectionId");
    if (!requestId || sourceCollectionId !== collectionId) return;
    const req = requests.find((r) => r.id === requestId);
    if (req?.folderId === folder.id) return;
    try {
      await coreStore.moveRequest(requestId, folder.id);
      const reqs = await coreStore.listRequests();
      set({ requests: reqs });
    } catch (err) {
      addToast("error", String(err));
    }
  };

  const saveDescription = async (description: string) => {
    setDescModal(false);
    try {
      await coreStore.updateFolder({ ...folder, description });
      const folds = await coreStore.listFolders();
      set({ folders: folds });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  return (
    <>
      <div>
        <div
          className={`group flex items-center gap-1.5 px-3 py-1 cursor-pointer rounded mx-1 text-[var(--text-2)] transition-colors ${isDragOver ? "bg-[var(--accent-subtle,var(--surface-2))] ring-1 ring-inset ring-[var(--accent,var(--border))]" : "hover:bg-[var(--surface-2)]"}`}
          onClick={() => toggleFolder(folder.id)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
          <span
            className="flex-1 text-xs truncate"
            title={folder.description || undefined}
          >
            {folder.name}
          </span>
          {folder.description && (
            <span title={folder.description} className="shrink-0">
              <FileText size={11} className="text-[var(--text-3)]" />
            </span>
          )}
          <div
            ref={menuRef}
            className="opacity-0 group-hover:opacity-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[140px]">
                <CollectionMenuItem
                  icon={<Play size={12} />}
                  label="Run"
                  onClick={() => {
                    setMenuOpen(false);
                    set({
                      showCollectionRunner: true,
                      collectionRunnerTarget: {
                        type: "folder",
                        id: folder.id,
                        name: folder.name,
                      },
                    });
                  }}
                />
                <CollectionMenuItem
                  icon={<Variable size={12} />}
                  label="Variables"
                  onClick={openVariableEditor}
                />
                <CollectionMenuItem
                  icon={<FileText size={12} />}
                  label="Description"
                  onClick={() => {
                    setMenuOpen(false);
                    setDescModal(true);
                  }}
                />
                <CollectionMenuItem
                  icon={<Trash2 size={12} />}
                  label="Delete"
                  danger
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteModal(true);
                  }}
                />
              </div>
            )}
          </div>
        </div>
        {expanded && (
          <div className="ml-3">
            {folderRequests.map((r) => (
              <CollectionRequestNode
                key={r.id}
                request={r}
                collectionId={collectionId}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteModal}
        title="Delete Folder"
        message={
          <span className="flex flex-col gap-2">
            <span>Are you sure you want to delete:</span>
            <strong className="break-all">{folder.name}</strong>
            <span>This action cannot be undone.</span>
          </span>
        }
        confirmLabel="Delete"
        danger
        onConfirm={deleteFolder}
        onClose={() => setDeleteModal(false)}
      />

      <PromptModal
        open={descModal}
        title={`Description - ${folder.name}`}
        label="Description"
        defaultValue={folder.description ?? ""}
        placeholder="Describe this folder..."
        multiline
        confirmLabel="Save"
        allowEmpty
        onConfirm={saveDescription}
        onClose={() => setDescModal(false)}
      />
    </>
  );
}
