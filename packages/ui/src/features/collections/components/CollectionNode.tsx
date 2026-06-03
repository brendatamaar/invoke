import { useEffect, useReducer, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Collection } from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { useFolders } from "../../../hooks/useDb";
import { CollectionFolderNode } from "./CollectionFolderNode";
import { CollectionRequestNode } from "./CollectionRequestNode";
import { CollectionActionsMenu } from "./tree/CollectionActionsMenu";
import { CollectionNodeModals } from "./tree/CollectionNodeModals";
import { exportCollectionToOpenApi, exportCollectionToZip } from "../utils/exportCollection";
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
  type CollectionNodeState = {
    menuOpen: boolean;
    addReqModal: boolean;
    addFolderModal: boolean;
    renameModal: boolean;
    deleteModal: boolean;
    isDragOver: boolean;
  };
  const [state, dispatch] = useReducer(
    (prev: CollectionNodeState, patch: Partial<CollectionNodeState>) => ({ ...prev, ...patch }),
    {
      menuOpen: false,
      addReqModal: false,
      addFolderModal: false,
      renameModal: false,
      deleteModal: false,
      isDragOver: false,
    },
  );
  const { menuOpen, addReqModal, addFolderModal, renameModal, deleteModal, isDragOver } = state;
  const setMenuOpen = (v: boolean) => dispatch({ menuOpen: v });
  const setAddReqModal = (v: boolean) => dispatch({ addReqModal: v });
  const setAddFolderModal = (v: boolean) => dispatch({ addFolderModal: v });
  const setRenameModal = (v: boolean) => dispatch({ renameModal: v });
  const setDeleteModal = (v: boolean) => dispatch({ deleteModal: v });
  const setIsDragOver = (v: boolean) => dispatch({ isDragOver: v });
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
  const totalRequests = requests.filter((request) => request.collectionId === collection.id).length;

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
          className={`group flex items-center gap-1.5 rounded mx-1 transition-colors ${isDragOver ? "bg-[var(--accent-subtle,var(--surface-2))] ring-1 ring-inset ring-[var(--accent,var(--border))]" : "hover:bg-[var(--surface-2)]"}`}
          onDragOver={(event) => handleCollectionDragOver(event, collection.id, setIsDragOver)}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setIsDragOver(false);
            }
          }}
          onDrop={(event) =>
            handleCollectionDrop(event, collection.id, requests, setIsDragOver, addToast)
          }
        >
          <button
            type="button"
            className="flex flex-1 items-center gap-1.5 px-3 py-1.5 cursor-pointer text-left min-w-0"
            onClick={() => toggleFolder(collection.id)}
          >
            {expanded ? (
              <ChevronDown size={13} className="text-[var(--text-3)]" />
            ) : (
              <ChevronRight size={13} className="text-[var(--text-3)]" />
            )}
            <span className="flex-1 text-xs font-semibold text-[var(--text-1)] truncate">
              {collection.name}
            </span>
            <span className="text-2xs text-[var(--text-3)]">{totalRequests}</span>
          </button>
          <CollectionActionsMenu
            open={menuOpen}
            menuRef={menuRef}
            onToggle={() => setMenuOpen(!menuOpen)}
            onNewRequest={() => openModal(setMenuOpen, setAddReqModal)}
            onNewFolder={() => openModal(setMenuOpen, setAddFolderModal)}
            onRename={() => openModal(setMenuOpen, setRenameModal)}
            onVariables={() => openVariables(collection, setMenuOpen, set)}
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
              <CollectionRequestNode
                key={request.id}
                request={request}
                collectionId={collection.id}
              />
            ))}
          </div>
        )}
      </div>
      <CollectionNodeModals
        collectionName={collection.name}
        addFolderOpen={addFolderModal}
        addRequestOpen={addReqModal}
        renameOpen={renameModal}
        deleteOpen={deleteModal}
        onAddFolder={addFolder}
        onAddRequest={addRequest}
        onRename={(name) => {
          setRenameModal(false);
          if (name !== collection.name) updateCollection({ name });
        }}
        onDelete={deleteCollection}
        onCloseAddFolder={() => setAddFolderModal(false)}
        onCloseAddRequest={() => setAddReqModal(false)}
        onCloseRename={() => setRenameModal(false)}
        onCloseDelete={() => setDeleteModal(false)}
      />
    </>
  );
}
