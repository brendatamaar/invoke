import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import type { Folder as FolderType } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { FolderActionsMenu } from "./tree/FolderActionsMenu";
import { FolderNodeModals } from "./tree/FolderNodeModals";
import { FolderRequestList } from "./tree/FolderRequestList";
import {
  handleFolderDragOver,
  handleFolderDrop,
  handleFolderItemDragOver,
  handleFolderListDrop,
} from "./tree/folderDrag";

export function CollectionFolderNode({
  folder,
  collectionId,
}: {
  folder: FolderType;
  collectionId: string;
}) {
  const { expandedFolderIds, toggleFolder, requests, set, addToast } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [descModal, setDescModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const expanded = expandedFolderIds.includes(folder.id);
  const sortedRequests = useMemo(
    () =>
      requests
        .filter((request) => request.folderId === folder.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [folder.id, requests],
  );

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
      addToast("success", "Folder deleted");
    } catch (error) {
      addToast("error", String(error));
    }
  };
  const saveDescription = async (description: string) => {
    setDescModal(false);
    try {
      await coreStore.updateFolder({ ...folder, description });
    } catch (error) {
      addToast("error", String(error));
    }
  };
  const moveToFolder = async (requestId: string) => {
    const req = requests.find((request) => request.id === requestId);
    if (req?.folderId === folder.id) return;
    await coreStore.moveRequest(requestId, folder.id);
  };

  return (
    <>
      <div>
        <div
          className={`group flex items-center gap-1.5 px-3 py-1 cursor-pointer rounded mx-1 text-[var(--text-2)] transition-colors ${isDragOver ? "bg-[var(--accent-subtle,var(--surface-2))] ring-1 ring-inset ring-[var(--accent,var(--border))]" : "hover:bg-[var(--surface-2)]"}`}
          onClick={() => toggleFolder(folder.id)}
          onDragOver={(event) => handleFolderDragOver(event, collectionId, setIsDragOver)}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragOver(false);
            }
          }}
          onDrop={(event) =>
            handleFolderDrop(event, collectionId, setIsDragOver, moveToFolder, addToast)
          }
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
          <span className="flex-1 text-xs truncate" title={folder.description || undefined}>
            {folder.name}
          </span>
          {folder.description && (
            <span title={folder.description} className="shrink-0">
              <FileText size={11} className="text-[var(--text-3)]" />
            </span>
          )}
          <FolderActionsMenu
            open={menuOpen}
            menuRef={menuRef}
            onToggle={() => setMenuOpen((value) => !value)}
            onRun={() => {
              setMenuOpen(false);
              set({
                showCollectionRunner: true,
                collectionRunnerTarget: { type: "folder", id: folder.id, name: folder.name },
              });
            }}
            onVariables={openVariableEditor}
            onDescription={() => {
              setMenuOpen(false);
              setDescModal(true);
            }}
            onDelete={() => {
              setMenuOpen(false);
              setDeleteModal(true);
            }}
          />
        </div>
        {expanded && (
          <FolderRequestList
            requests={sortedRequests}
            collectionId={collectionId}
            dragOverIndex={dragOverIndex}
            onItemDragOver={(event, index) =>
              handleFolderItemDragOver(event, index, collectionId, setDragOverIndex)
            }
            onListDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                setDragOverIndex(null);
              }
            }}
            onListDrop={(event) =>
              handleFolderListDrop(
                event,
                collectionId,
                folder.id,
                dragOverIndex,
                sortedRequests,
                setDragOverIndex,
                setIsDragOver,
                addToast,
              )
            }
          />
        )}
      </div>
      <FolderNodeModals
        folderName={folder.name}
        description={folder.description}
        deleteOpen={deleteModal}
        descriptionOpen={descModal}
        onConfirmDelete={deleteFolder}
        onDeleteClose={() => setDeleteModal(false)}
        onSaveDescription={saveDescription}
        onDescriptionClose={() => setDescModal(false)}
      />
    </>
  );
}
