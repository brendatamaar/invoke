import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  FileText,
  FolderPlus,
  MoreHorizontal,
  Play,
  Plus,
  Trash2,
  Variable,
} from "lucide-react";
import {
  exportCollectionAsOpenApi,
  exportCollectionZip,
  type Collection,
} from "@invoke/core";
import { useStore, coreStore } from "../../../store";
import { ConfirmModal } from "../../../components/shared/ConfirmModal";
import { PromptModal } from "../../../components/shared/PromptModal";
import { CollectionFolderNode } from "./CollectionFolderNode";
import { CollectionMenuItem } from "./CollectionMenuItem";
import { CollectionRequestNode } from "./CollectionRequestNode";

export function CollectionNode({ collection }: { collection: Collection }) {
  const { expandedFolderIds, toggleFolder, folders, requests, set, addToast } =
    useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [addReqModal, setAddReqModal] = useState(false);
  const [addFolderModal, setAddFolderModal] = useState(false);
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
  const [renameModal, setRenameModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [descModal, setDescModal] = useState(false);
  const expanded = expandedFolderIds.includes(collection.id);
  const colFolders = folders.filter(
    (f) => f.collectionId === collection.id && !f.parentFolderId,
  );
  const colRequests = requests.filter(
    (r) => r.collectionId === collection.id && !r.folderId,
  );
  const totalRequests = requests.filter(
    (r) => r.collectionId === collection.id,
  ).length;

  const del = async () => {
    setDeleteModal(false);
    try {
      await coreStore.deleteCollection(collection.id);
      const cols = await coreStore.listCollections();
      set({
        collections: cols,
        requests: requests.filter((r) => r.collectionId !== collection.id),
        folders: folders.filter((f) => f.collectionId !== collection.id),
      });
      addToast("success", "Collection deleted");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes(`collection/${collection.id}`)) return;
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
    if (!requestId || sourceCollectionId !== collection.id) return;
    const req = requests.find((r) => r.id === requestId);
    if (!req?.folderId) return;
    try {
      await coreStore.moveRequest(requestId, null);
      const reqs = await coreStore.listRequests();
      set({ requests: reqs });
    } catch (err) {
      addToast("error", String(err));
    }
  };

  const addFolder = async (name: string) => {
    setAddFolderModal(false);
    try {
      await coreStore.createFolder(collection.id, name);
      const folds = await coreStore.listFolders();
      set({ folders: folds });
      if (!expandedFolderIds.includes(collection.id)) toggleFolder(collection.id);
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const addRequest = async (name: string) => {
    setAddReqModal(false);
    try {
      await coreStore.saveRequest(
        {
          method: "GET",
          url: "",
          params: [],
          headers: [],
          bodyMode: "none",
          body: "",
          auth: { type: "none" },
          timeoutMs: 30000,
        },
        name,
        collection.id,
      );
      const reqs = await coreStore.listRequests();
      set({ requests: reqs });
      if (!expandedFolderIds.includes(collection.id))
        toggleFolder(collection.id);
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const rename = async (name: string) => {
    setRenameModal(false);
    if (name === collection.name) return;
    try {
      await coreStore.updateCollection({ ...collection, name });
      const cols = await coreStore.listCollections();
      set({ collections: cols });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const saveDescription = async (description: string) => {
    setDescModal(false);
    try {
      await coreStore.updateCollection({ ...collection, description });
      const cols = await coreStore.listCollections();
      set({ collections: cols });
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const exportZip = async () => {
    setMenuOpen(false);
    try {
      const colRequests = requests.filter(
        (r) => r.collectionId === collection.id,
      );
      const colFolders = folders.filter(
        (f) => f.collectionId === collection.id,
      );
      const blob = await exportCollectionZip(
        collection,
        colRequests,
        colFolders,
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collection.name.replace(/\s+/g, "-")}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("success", "Collection exported");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const exportOpenApi = () => {
    setMenuOpen(false);
    try {
      const colRequests = requests.filter(
        (r) => r.collectionId === collection.id,
      );
      const colFolders = folders.filter(
        (f) => f.collectionId === collection.id,
      );
      const yamlStr = exportCollectionAsOpenApi(
        collection,
        colRequests,
        colFolders,
      );
      const blob = new Blob([yamlStr], { type: "text/yaml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${collection.name.replace(/\s+/g, "-")}-openapi.yaml`;
      a.click();
      URL.revokeObjectURL(url);
      addToast("success", "OpenAPI spec exported");
    } catch (e) {
      addToast("error", String(e));
    }
  };

  const openVariableEditor = () => {
    setMenuOpen(false);
    set({
      variableEditor: {
        open: true,
        kind: "collection",
        id: collection.id,
        name: collection.name,
        variables: collection.variables ?? [],
      },
    });
  };

  return (
    <>
      <div className="mb-0.5">
        <div
          className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer rounded mx-1 transition-colors ${isDragOver ? "bg-[var(--accent-subtle,var(--surface-2))] ring-1 ring-inset ring-[var(--accent,var(--border))]" : "hover:bg-[var(--surface-2)]"}`}
          onClick={() => toggleFolder(collection.id)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {expanded ? (
            <ChevronDown size={13} className="text-[var(--text-3)]" />
          ) : (
            <ChevronRight size={13} className="text-[var(--text-3)]" />
          )}
          <span
            className="flex-1 text-xs font-semibold text-[var(--text-1)] truncate"
            title={collection.description || undefined}
          >
            {collection.name}
          </span>
          {collection.description && (
            <span title={collection.description} className="shrink-0">
              <FileText size={11} className="text-[var(--text-3)]" />
            </span>
          )}
          <span className="text-2xs text-[var(--text-3)]">
            {totalRequests}
          </span>
          <div
            ref={menuRef}
            className="opacity-0 group-hover:opacity-100 relative ml-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-0.5 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-[var(--shadow-2)] py-1 min-w-[160px]">
                <CollectionMenuItem
                  icon={<Plus size={12} />}
                  label="New Request"
                  onClick={() => {
                    setMenuOpen(false);
                    setAddReqModal(true);
                  }}
                />
                <CollectionMenuItem
                  icon={<FolderPlus size={12} />}
                  label="New Folder"
                  onClick={() => {
                    setMenuOpen(false);
                    setAddFolderModal(true);
                  }}
                />
                <CollectionMenuItem
                  icon={<Edit3 size={12} />}
                  label="Rename"
                  onClick={() => {
                    setMenuOpen(false);
                    setRenameModal(true);
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
                  icon={<Play size={12} />}
                  label="Run"
                  onClick={() => {
                    setMenuOpen(false);
                    set({
                      showCollectionRunner: true,
                      collectionRunnerTarget: {
                        type: "collection",
                        id: collection.id,
                        name: collection.name,
                      },
                    });
                  }}
                />
                <CollectionMenuItem
                  icon={<Download size={12} />}
                  label="Export ZIP"
                  onClick={exportZip}
                />
                <CollectionMenuItem
                  icon={<Download size={12} />}
                  label="Export OpenAPI"
                  onClick={exportOpenApi}
                />
                <div className="h-px bg-[var(--border)] my-1" />
                <CollectionMenuItem
                  icon={<Trash2 size={12} />}
                  label="Delete"
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteModal(true);
                  }}
                  danger
                />
              </div>
            )}
          </div>
        </div>

        {expanded && (
          <div>
            {colFolders.map((f) => (
              <CollectionFolderNode
                key={f.id}
                folder={f}
                collectionId={collection.id}
              />
            ))}
            {colRequests.map((r) => (
              <CollectionRequestNode
                key={r.id}
                request={r}
                collectionId={collection.id}
              />
            ))}
          </div>
        )}
      </div>

      <PromptModal
        open={addFolderModal}
        title="New Folder"
        label="Name"
        placeholder="My Folder"
        onConfirm={addFolder}
        onClose={() => setAddFolderModal(false)}
      />
      <PromptModal
        open={addReqModal}
        title="New Request"
        label="Name"
        defaultValue="New Request"
        onConfirm={addRequest}
        onClose={() => setAddReqModal(false)}
      />
      <PromptModal
        open={renameModal}
        title="Rename Collection"
        label="Name"
        defaultValue={collection.name}
        onConfirm={rename}
        onClose={() => setRenameModal(false)}
      />
      <ConfirmModal
        open={deleteModal}
        title="Delete Collection"
        message={
          <span className="flex flex-col gap-2">
            <span>Are you sure you want to delete:</span>
            <strong className="break-all">{collection.name}</strong>
            <span>This action cannot be undone.</span>
          </span>
        }
        confirmLabel="Delete"
        danger
        onConfirm={del}
        onClose={() => setDeleteModal(false)}
      />
      <PromptModal
        open={descModal}
        title={`Description - ${collection.name}`}
        label="Description"
        defaultValue={collection.description ?? ""}
        placeholder="Describe this collection..."
        multiline
        confirmLabel="Save"
        allowEmpty
        onConfirm={saveDescription}
        onClose={() => setDescModal(false)}
      />
    </>
  );
}
