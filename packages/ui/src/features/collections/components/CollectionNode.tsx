import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import type { Collection } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { useFolders } from "../../../hooks/useDb";
import { CollectionFolderNode } from "./CollectionFolderNode";
import { CollectionRequestNode } from "./CollectionRequestNode";
import { CollectionActionsMenu } from "./tree/CollectionActionsMenu";
import { CollectionNodeModals } from "./tree/CollectionNodeModals";
import {
  exportCollectionToOpenApi,
  exportCollectionToZip,
} from "../utils/exportCollection";
import {
  emptyRequest,
  handleCollectionDragOver,
  handleCollectionDrop,
  openModal,
  openVariables,
  runCollection,
} from "./tree/collectionNodeActions";

export function CollectionNode({ collection }: { collection: Collection }) {
  const { expandedFolderIds, toggleFolder, requests, set, addToast } = useStore();
  const folders = useFolders();
  const [menuOpen, setMenuOpen] = useState(false);
  const [addReqModal, setAddReqModal] = useState(false);
  const [addFolderModal, setAddFolderModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [descModal, setDescModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
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

  const expanded = expandedFolderIds.includes(collection.id);
  const colFolders = folders.filter(
    (folder) => folder.collectionId === collection.id && !folder.parentFolderId,
  );
  const colRequests = requests.filter(
    (request) => request.collectionId === collection.id && !request.folderId,
  );
  const totalRequests = requests.filter(
    (request) => request.collectionId === collection.id,
  ).length;

  const addFolder = async (name: string) => {
    setAddFolderModal(false);
    try {
      await coreStore.createFolder(collection.id, name);
      if (!expandedFolderIds.includes(collection.id)) toggleFolder(collection.id);
    } catch (error) {
      addToast("error", String(error));
    }
  };
  const addRequest = async (name: string) => {
    setAddReqModal(false);
    try {
      await coreStore.saveRequest(emptyRequest(), name, collection.id);
      if (!expandedFolderIds.includes(collection.id)) toggleFolder(collection.id);
    } catch (error) {
      addToast("error", String(error));
    }
  };
  const updateCollection = async (patch: Partial<Collection>) => {
    try {
      await coreStore.updateCollection({ ...collection, ...patch });
    } catch (error) {
      addToast("error", String(error));
    }
  };
  const deleteCollection = async () => {
    setDeleteModal(false);
    try {
      await coreStore.deleteCollection(collection.id);
      set({ requests: requests.filter((request) => request.collectionId !== collection.id) });
      addToast("success", "Collection deleted");
    } catch (error) {
      addToast("error", String(error));
    }
  };
  const exportWithToast = async (kind: "zip" | "openapi") => {
    setMenuOpen(false);
    try {
      const colRequests = requests.filter((request) => request.collectionId === collection.id);
      const colFolders = folders.filter((folder) => folder.collectionId === collection.id);
      if (kind === "zip") await exportCollectionToZip(collection, colRequests, colFolders);
      else exportCollectionToOpenApi(collection, colRequests, colFolders);
      addToast("success", kind === "zip" ? "Collection exported" : "OpenAPI spec exported");
    } catch (error) {
      addToast("error", String(error));
    }
  };

  return (
    <>
      <div className="mb-0.5">
        <div
          className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded mx-1 transition-colors ${isDragOver ? "bg-[var(--accent-subtle,var(--surface-2))] ring-1 ring-inset ring-[var(--accent,var(--border))]" : "hover:bg-[var(--surface-2)]"}`}
          onClick={() => toggleFolder(collection.id)}
          onDragOver={(event) =>
            handleCollectionDragOver(event, collection.id, setIsDragOver)
          }
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragOver(false);
            }
          }}
          onDrop={(event) =>
            handleCollectionDrop(
              event,
              collection.id,
              requests,
              setIsDragOver,
              addToast,
            )
          }
        >
          {expanded ? <ChevronDown size={13} className="text-[var(--text-3)]" /> : <ChevronRight size={13} className="text-[var(--text-3)]" />}
          <span className="flex-1 text-xs font-semibold text-[var(--text-1)] truncate" title={collection.description || undefined}>
            {collection.name}
          </span>
          {collection.description && (
            <span title={collection.description} className="shrink-0">
              <FileText size={11} className="text-[var(--text-3)]" />
            </span>
          )}
          <span className="text-2xs text-[var(--text-3)]">{totalRequests}</span>
          <CollectionActionsMenu
            open={menuOpen}
            menuRef={menuRef}
            onToggle={() => setMenuOpen((value) => !value)}
            onNewRequest={() => openModal(setMenuOpen, setAddReqModal)}
            onNewFolder={() => openModal(setMenuOpen, setAddFolderModal)}
            onRename={() => openModal(setMenuOpen, setRenameModal)}
            onVariables={() => openVariables(collection, setMenuOpen, set)}
            onDescription={() => openModal(setMenuOpen, setDescModal)}
            onRun={() => runCollection(collection, setMenuOpen, set)}
            onExportZip={() => exportWithToast("zip")}
            onExportOpenApi={() => exportWithToast("openapi")}
            onDelete={() => openModal(setMenuOpen, setDeleteModal)}
          />
        </div>
        {expanded && (
          <div>
            {colFolders.map((folder) => (
              <CollectionFolderNode key={folder.id} folder={folder} collectionId={collection.id} />
            ))}
            {colRequests.map((request) => (
              <CollectionRequestNode key={request.id} request={request} collectionId={collection.id} />
            ))}
          </div>
        )}
      </div>
      <CollectionNodeModals
        collectionName={collection.name}
        description={collection.description}
        addFolderOpen={addFolderModal}
        addRequestOpen={addReqModal}
        renameOpen={renameModal}
        deleteOpen={deleteModal}
        descriptionOpen={descModal}
        onAddFolder={addFolder}
        onAddRequest={addRequest}
        onRename={(name) => {
          setRenameModal(false);
          if (name !== collection.name) updateCollection({ name });
        }}
        onDelete={deleteCollection}
        onSaveDescription={(description) => {
          setDescModal(false);
          updateCollection({ description });
        }}
        onCloseAddFolder={() => setAddFolderModal(false)}
        onCloseAddRequest={() => setAddReqModal(false)}
        onCloseRename={() => setRenameModal(false)}
        onCloseDelete={() => setDeleteModal(false)}
        onCloseDescription={() => setDescModal(false)}
      />
    </>
  );
}
